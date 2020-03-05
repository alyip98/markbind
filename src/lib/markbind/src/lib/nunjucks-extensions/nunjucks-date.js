const nunjucks = require('nunjucks');
const Moment = require('moment');

const DEFAULT_FORMAT = 'ddd D MMM'; // e.g. Thu 27 Aug

/**
 * Calculates the result of adding {days} days to the base date
 * @param base
 * @param days
 */
function calculateTarget(base, days) {
  return Moment(base).add(days, 'days');
}

function RemoteExtension() {
  this.tags = ['date'];

  this.parse = function(parser, nodes) {
    // Adapted from https://mozilla.github.io/nunjucks/api.html#custom-tags
    // get the tag token
    const tok = parser.nextToken();

    // parse the args and move after the block end. passing true
    // as the second arg is required if there are no parentheses
    const args = parser.parseSignature(null, true);
    parser.advanceAfterBlockEnd(tok.value);

    return new nodes.CallExtension(this, 'run', args);
  };

  this.run = function(context, ...args) {
    console.log(args);
    [baseDate, day, format] = args;

    return new nunjucks.runtime.SafeString(calculateTarget(baseDate, day)
      .format(format || DEFAULT_FORMAT));

  };
}

module.exports = new RemoteExtension();
