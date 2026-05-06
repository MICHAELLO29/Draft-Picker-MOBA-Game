import * as cheerio from 'cheerio';

async function run() {
  const res = await fetch('https://mlbbhub.com/statistics');
  const html = await res.text();
  const $ = cheerio.load(html);
  
  $('a[href*="/heroes/"]').slice(0, 5).each((i, el) => {
    console.log('LINK:', $(el).attr('href'));
    console.log('PARENT ROW:', $(el).closest('tr, div').text().trim());
    console.log('---');
  });
}

run();
