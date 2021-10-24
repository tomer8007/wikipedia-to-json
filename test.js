
var wikipediaParser = require('./WikipediaParser');
wikipediaParser.fetchArticleElements("United States").then(function(result)
{
    console.log(result);

}).catch(function(error)
{
    console.log(error);
});