/**
 * Created by Tomer on 26/11/2016.
 */


var wikiUtils = {};

wikiUtils.optimizeArticleTitle = function(articleTitle)
{
    var splits = articleTitle.split("#");
    articleTitle = splits[splits.length - 1];
    var badCharacters = ['\'','\"','<','>'];
    for (var i=0;i<badCharacters.length;i++)
    {
        articleTitle = articleTitle.replace(badCharacters[i],'');
    }
    return articleTitle;
};
wikiUtils.isValidLink = function(linkHref)
{
    if (linkHref.indexOf("/wiki/") == -1) return false;
    if (linkHref.startsWith("http"))
    {
        // block external links
        if (linkHref.startsWith("https://en.wikipedia.org/wiki/")) return true;
        return false;
    }
    return true;
};
wikiUtils.friendlyArticleName = function(articleName)
{
    articleName = replaceAll(articleName, '_', ' ').split('#')[0];
    return decodeURI(articleName);
};
wikiUtils.superFriendlyArticleName = function(articleName)
{
    articleName = wikiUtils.friendlyArticleName(articleName);
    //articleName = articleName.replace(/ *\([^)]*\) */g, "");
    // Cearful. the above regex removes white spaces before and after the brackets too: "hi (what) there" --> "hithere"
    return articleName;
};
wikiUtils.unfriendlyArticleName = function(articleName)
{
    articleName = replaceAll(articleName, ' ', '_');
    return articleName;
};
wikiUtils.equals = function(article1, article2)
{
    var article1Trimmed = article1.toLocaleLowerCase().trim(), article2Trimmed = article2.toLocaleLowerCase().trim();
    if (article1Trimmed == article2Trimmed) return true;
    if (wikiUtils.friendlyArticleName(article1Trimmed) == wikiUtils.friendlyArticleName(article2Trimmed)) return true;

    return false;
};

function replaceAll(target, search, replacement)
{
    return target.split(search).join(replacement);
}

module.exports = wikiUtils;