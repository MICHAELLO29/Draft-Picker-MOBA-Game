const cheerio = require('cheerio'); fetch('https://mlbbhub.com/heroes/aamon').then(r => r.text()).then(t => { const $ = cheerio.load(t); $('img').each((i, el) => console.log($(el).attr('src'))); })
