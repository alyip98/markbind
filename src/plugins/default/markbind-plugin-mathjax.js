const cheerio = module.parent.require('cheerio');
const mathjax = module.parent.require('mathjax-node');

mathjax.config({
  MathJax: {
    // traditional MathJax configuration
  },
});
mathjax.start();

/**
 * Adds anchor links to headers
 */
module.exports = {
  preRender: async (content) => {
    const $ = cheerio.load(content, { xmlMode: false });
    const promises = [];
    $('latex').each((i, elem) => {
      const rawLatex = $(elem).contents().toString();
      promises.push(
        mathjax.typeset({
          math: rawLatex,
          format: 'TeX', // or "inline-TeX", "MathML"
          svg: true, // or svg:true, or html:true
        }).then((data) => {
          if (!data.errors) {
            $(elem).replaceWith(data.svg);
          }
        }));
    });

    await Promise.all(promises);
    return $.html();
  },
};
