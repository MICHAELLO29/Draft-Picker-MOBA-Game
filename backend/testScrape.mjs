import * as cheerio from 'cheerio';

async function run() {
  const res = await fetch('https://mlbbhub.com/counter/gloo');
  const html = await res.text();
  const $ = cheerio.load(html);

  // Find the "Heroes Gloo Counters" section
  const weakSection = $('h2:contains("Heroes Gloo Counters")').first();
  if (weakSection.length) {
    console.log('=== SECTION: Heroes Gloo Counters ===');
    // Get the next sibling content
    const sectionParent = weakSection.parent();
    sectionParent.find('a[href*="/counter/"]').each((i, el) => {
      const href = $(el).attr('href') ?? '';
      const slugMatch = href.match(/\/counter\/([a-z0-9-]+)$/);
      if (!slugMatch) return;
      const slug = slugMatch[1];
      if (slug === 'gloo') return;
      
      const linkText = $(el).text().trim();
      if (!linkText || linkText.length < 2) return;
      
      const parent = $(el).parent();
      const blockText = parent.parent().parent().text().trim();
      
      // Look for any percentage
      const percentages = [...blockText.matchAll(/([\d.]+)%/g)].map(m => m[1]);
      console.log(`[${slug}] "${linkText}" percentages: ${percentages.join(', ')}`);
      console.log(`  Block: ${blockText.substring(0, 200)}`);
      console.log('---');
    });
  }

  // Also check the "How to Counter" section separately
  const strongSection = $('h2:contains("How to Counter")').first();
  if (strongSection.length) {
    console.log('\n=== SECTION: How to Counter Gloo ===');
    const sectionParent = strongSection.parent();
    sectionParent.find('a[href*="/counter/"]').each((i, el) => {
      const href = $(el).attr('href') ?? '';
      const slugMatch = href.match(/\/counter\/([a-z0-9-]+)$/);
      if (!slugMatch) return;
      const slug = slugMatch[1];
      if (slug === 'gloo') return;
      
      const linkText = $(el).text().trim();
      if (!linkText || linkText.length < 2) return;
      
      const parent = $(el).parent();
      const blockText = parent.parent().parent().text().trim();
      const percentages = [...blockText.matchAll(/([\d.]+)%/g)].map(m => m[1]);
      console.log(`[${slug}] "${linkText}" percentages: ${percentages.join(', ')}`);
      console.log('---');
    });
  }
}

run();
