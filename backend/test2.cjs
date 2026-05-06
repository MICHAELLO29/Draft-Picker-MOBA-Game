const cheerio = require('cheerio'); fetch('https://mlbbhub.com/heroes').then(r => r.text()).then(t => { const $ = cheerio.load(t); console.log($('a[href^="/heroes/"]').first().html()); })
