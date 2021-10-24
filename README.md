# Wikipedia to JSON
Use this library to parse the HTML of wikipedia articles into machine-readable JSON objects. 
For example:
```javascript
[ 
  { type: 'MAIN_TITLE', text: 'United States' },
  { type: 'MAIN_IMAGE_URL',
    url: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a4/Flag_of_the_United_States.svg/500px-Flag_of_the_United_States.svg.png',
    full_url: 'https://upload.wikimedia.org/wikipedia/en/a/a4/Flag_of_the_United_States.svg' },
  { type: 'TITLE', text: 'Introduction' },
  { type: 'PARAGRAPH',
    text: 'The United States of America (/əˈmɛrɪkə/; USA), commonly known as the United States  ...' },
  { type: 'PARAGRAPH',
    text: 'At 3.8 million square miles ...' },
  ...
  { type: 'TITLE', text: 'Etymology' },
  { type: 'IMAGE',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Amerigo_Vespucci_-_Project_Gutenberg_etext_19997.jpg/140px-Amerigo_Vespucci_-_Project_Gutenberg_etext_19997.jpg',
    width: 140,
    height: 169,
    caption: 'America is named after Italian explorer Amerigo Vespucci.[45][46]',
    side: 'LEFT' },
  ...
  { type: 'SUBTITLE', text: 'Indigenous and European contact' },
  ...
]
```
## Installation and dependencies
First, install the dependencies with node package manager (npm):
```
npm install request
npm install jsdom
```
And then just clone it:
```
git clone https://github.com/tomer8007/wikipedia-to-json
```
## Usage
```javascript
var wikipediaParser = require('./WikipediaParser');
wikipediaParser.fetchArticleElements("United States").then(function(result)
{
   console.log(result);
   
}).catch(function(error)
{
  console.log(error);
});
```
## Currenty Supported Elements
- Titles
- Paragraphs
- Subtitles
- Images
- Lists
- Quotes
