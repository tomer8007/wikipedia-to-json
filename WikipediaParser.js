
var wikiUtils = require('./WikipediaUtils');

var request = require("request"); // easier HTTP library
var jsdom = require("jsdom").jsdom; // javascript implementaion of DOM, used here for scrapping web pges

var TYPE_MAIN_TITLE = "MAIN_TITLE";
var TYPE_MAIN_IMAGE_URL = "MAIN_IMAGE_URL";
var TYPE_TITLE = "TITLE";
var TYPE_PARAGRAPH = "PARAGRAPH";
var TYPE_IMAGE = "IMAGE";
var TYPE_TABLE = "TABLE";
var TYPE_QUOTE = "QUOTE";
var TYPE_SUBTITLE = "SUBTITLE";
var TYPE_SUB_SUBTITLE = "SUB_SUBTITLE";
var TYPE_LIST = "LIST";
var TYPE_LIST_ITEM = "LIST_ITEM";

var LIST_TYPE_BULLETED = "BULLETED";
var LIST_TYPE_NUMBERED = "NUMBERED";
var LIST_TYPE_INDENTED = "INDENTED";

var IMAGE_SIDE_NONE = "NONE";
var IMAGE_SIDE_RIGHT = "RIGHT";
var IMAGE_SIDE_LEFT = "LEFT";

var STATUS_ERROR_WIKI_API = "ERROR_WIKI_API";
var STATUS_ERROR_WIKI_NOT_REACHABLE = "ERROR_WIKI_NOT_REACHABLE";
var STATUS_EROROR_PARSING_FAILED = "ERROR_PARSING_FAILED";

module.exports =
{
    fetchArticleElements: function(articleTitle)
    {
        return new Promise(function(resolve, reject)
        {
            articleTitle = encodeURIComponent(wikiUtils.optimizeArticleTitle(articleTitle));
            console.log("[+] Sending requests to wikipedia API ...");

            request({url: 'https://en.wikipedia.org/w/api.php?action=query&titles=' + articleTitle + '&prop=pageimages&format=json&pithumbsize=500&redirects=', forever: true} , function (error, response, imageBody)
            {
                if (error || !isValidJSON(imageBody))
                {
                    reject(STATUS_ERROR_WIKI_API);
                    return;
                }

                var wikiJSON = JSON.parse(imageBody);
                var pages = wikiJSON["query"]["pages"];
                var imageURL = null;

                for (var key in pages)
                {
                    articleTitle = pages[key]["title"];
                    if ("thumbnail" in pages[key])
                    {
                        if ("source" in pages[key]["thumbnail"])
                        {
                            imageURL = pages[key]["thumbnail"]["source"];
                        }
                    }
                }

                console.log("[+] Downloading wikipedia article \"" + articleTitle +"\"...");
                request({url: 'https://en.wikipedia.org/wiki/' + articleTitle + "?action=render", forever: true}, function (error, response, wikiBody)
                {
                    if (error)
                    {
                        reject(STATUS_ERROR_WIKI_NOT_REACHABLE);
                        return;
                    }

                    var elements = parseWikipediaHTML(wikiBody, articleTitle, imageURL);
                    if (elements.length == 0)
                    {
                        reject(STATUS_EROROR_PARSING_FAILED);
                        return;
                    }

                    resolve(elements);

                });
            });
        });
    }
};

function parseWikipediaHTML(html, articleTitle, imageURL)
{
    console.log("[+] Processing wikipedia response...");

    var doc = jsdom(html);
    var elements = [];

    var mainElement = doc.getElementsByClassName("mw-parser-output")[0];

    // push main title
    elements.push(createTextElement(TYPE_MAIN_TITLE, articleTitle));

    // push main image
    var foundMainImage = false;
    var mainImageElement = imageURL ? createMainImageElement(imageURL, null, null) : extractMainImageFromInfobox(mainElement);
    if (mainImageElement != null)
    {
        elements.push(mainImageElement);
        foundMainImage = true;
    }
    elements.push(createTextElement(TYPE_TITLE, "Introduction"));

    // removing bad elements like '[Edit]' or 'Coordinates: ...'
    var badElements = mainElement.getElementsByClassName("mw-editsection");
    for (var x=0;x<badElements.length;x++) badElements[x].innerHTML = '';
    var coordinatesElement = doc.getElementById("coordinates");
    if (coordinatesElement) coordinatesElement.innerHTML = '';

    var wikiElements = mainElement.childNodes;
    for (var i = 0; i < wikiElements.length; i++)
    {
        var currentElement = wikiElements[i];
        var elementText = currentElement.textContent.trim();

        switch (currentElement.tagName)
        {
            case "H2":
                elements.push(createTextElement(TYPE_TITLE, elementText));
                break;
            case "H3":
                elements.push(createTextElement(TYPE_SUBTITLE, elementText));
                break;
            case "H4":
            case "H5":
            case "H6":
                elements.push(createTextElement(TYPE_SUB_SUBTITLE, elementText));
                break;
            case "P":
                var paragraphParsedText = parseTextFromElement(currentElement);

                if (paragraphParsedText.length > 0)
                    elements.push(createTextElement(TYPE_PARAGRAPH, paragraphParsedText));
                break;
            case "BLOCKQUOTE":
                var quote = elementText;
                var caption = null;
                var captionElements = currentElement.getElementsByClassName("templatequotecite");
                if (captionElements.length > 0)
                {
                    caption = captionElements[0].textContent;
                    captionElements[0].innerHTML = "";
                    quote = currentElement.textContent.trim();
                }
                elements.push(createQuoteElement(quote, caption));
                break;
            case "UL":
            case "OL":
            case "DL":
                var listElement = parseList(currentElement);
                if (listElement["list_items"].length > 0)
                    elements.push(listElement);
                break;
            case "TABLE":
                if (currentElement.className.startsWith("wikitable"))
                {
                    elements.push(createTextElement(TYPE_TABLE, "Unsupported!"));
                }
                break;
        }

        if (currentElement.className == "thumb tright" || currentElement.className == "thumb tleft")
        {
            // looking for an image
            var subImageNodes = currentElement.getElementsByClassName("image");
            if (subImageNodes.length > 0)
            {
                if (subImageNodes[0].getElementsByTagName("img").length > 0)
                {
                    // image found
                    var imageSide = currentElement.className == "thumb tright" ? IMAGE_SIDE_RIGHT : IMAGE_SIDE_LEFT;
                    var imageElement = parseImage(subImageNodes[0].getElementsByTagName("img")[0], imageSide);
                    if (imageElement.height >= 80 && imageElement.width >= 90 && !foundMainImage)
                    {
                        imageElement = createMainImageElement(imageElement.url, imageElement.height, imageElement.width);
                        foundMainImage = true;
                    }
                    elements.push(imageElement);
                }
            }
        }
    }

    return elements;
}

function parseTextFromElement(element)
{
    var parsedText = "";
    var childs = element.childNodes;
    var NODE_TEXT_TYPE = 3;

    for (var j=0;j<childs.length;j++)
    {
        var child = childs[j];
        if (child.nodeType == NODE_TEXT_TYPE || child.tagName == "B" || child.tagName == "SPAN" || child.tagName == "I")
        {
            parsedText += child.textContent;
        }
        else if (child.tagName == "A")
        {
            if (wikiUtils.isValidLink(child.href))
            {
                var linkStartMark = "[";
                var linkEndMark = "]";
                var linkSeperator = "|";

                var shouldMarkLinks = false;
                if (shouldMarkLinks)
                {
                    parsedText += linkStartMark + child.textContent + linkSeperator + child.href.slice(child.href.lastIndexOf("/") + 1) + linkEndMark;
                }
                else
                {
                    parsedText += child.textContent;
                }


            }
            else
            {
                // not a real link
                parsedText += child.textContent;
            }
        }
    }

    return parsedText;
}

function parseList(listElement)
{
    var listItems = [];
    var listType = LIST_TYPE_BULLETED;

    switch (listElement.tagName)
    {
        case "UL":
        case "OL":
            listType = listElement.tagName == "UL" ? LIST_TYPE_BULLETED : LIST_TYPE_NUMBERED;

            var childs = listElement.childNodes;
            for (var j=0;j<childs.length;j++)
            {
                var child = childs[j];
                if (child.tagName == "LI")
                {
                    var itemText = parseTextFromElement(child).trim();
                    if (itemText.length > 0)
                        listItems.push(createListItemElement(itemText));

                    // find ULs inside list items
                    var liChilds = child.childNodes;
                    for (var x=0;x<liChilds.length;x++)
                    {
                        if (liChilds[x].tagName == "UL")
                        {
                            var subList = parseList(liChilds[x]);
                            listItems.push(subList);
                        }
                    }
                }

            }
            break;
        case "DL":
            // description list. TODO
            break;
    }
    return createListElement(listItems, listType);
}

function parseImage(imageElement, imageSide)
{
    if (imageSide != IMAGE_SIDE_NONE && imageElement.tagName == "IMG")
    {
        var src = "https:" + imageElement.getAttribute("src");
        var width = parseInt(imageElement.getAttribute("width"));
        var height = parseInt(imageElement.getAttribute("height"));

        var children = imageElement.parentNode.parentNode.getElementsByTagName("div");
        var caption = "";
        for (var i=0;i<children.length;i++)
        {
            var child = children[i];
            if (child.getAttribute("class") == "thumbcaption")
                caption = child.textContent.trim();
        }

        if (src != "")
        {
            return createImageElement(src, width, height, caption, imageSide);
        }
    }

    return null;
}
function extractMainImageFromInfobox(mainElement)
{
    var infoboxes = mainElement.getElementsByClassName("infobox");
    if (infoboxes.length > 0)
    {
        var images = infoboxes[0].getElementsByTagName("img");
        for (var i=0;i<images.length;i++)
        {
            var imageElement = images[i];
            var src = "https:" + imageElement.getAttribute("src");
            var width = parseInt(imageElement.getAttribute("width"));
            var height = parseInt(imageElement.getAttribute("height"));

            if (width > 90 && height > 80)
            {
                return createMainImageElement(src, height, width);
            }
        }
    }

    return null;
}

function thumbImageToFullImageURL(url)
{
    return url.substring(0, url.lastIndexOf("/")).replace("/thumb/", "/");
}

function createTextElement(type, text)
{
    return {"type": type, "text": text};
}

function createQuoteElement(text, caption)
{
    if (caption != null)
        return {"type": TYPE_QUOTE, "text": text, "caption": caption};
    else
        return {"type": TYPE_QUOTE, "text": text};
}

function createListElement(listItems, listType)
{
    return {"type": TYPE_LIST, "list_items": listItems, "list_type": listType};
}

function createListItemElement(text)
{
    return {"type": TYPE_LIST_ITEM, "text": text};
}

function createMainImageElement(thumbUrl, height, width)
{
    if (height != null && width != null)
        return {"type": TYPE_MAIN_IMAGE_URL, "url": thumbUrl, "width": width, "height": height, "full_url": thumbImageToFullImageURL(thumbUrl)};
    else
        return {"type": TYPE_MAIN_IMAGE_URL, "url": thumbUrl, "full_url": thumbImageToFullImageURL(thumbUrl)};
}

function createImageElement(url, width, height, caption, side)
{
    return {"type": TYPE_IMAGE, "url": url, "width": width, "height": height, "caption": caption, "side": side};
}

function isValidJSON(str)
{
    try
    {
        JSON.parse(str);
    }
    catch (e)
    {
        return false;
    }
    return true;
}