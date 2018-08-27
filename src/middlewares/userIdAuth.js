/**
 * The userId authentication middleware.
 */
import config from 'config';
import util from '../util';

const tcCoreLibAuth = require('tc-core-library-js').auth;

const m2m = tcCoreLibAuth.m2m(config);

/**
 * The userId authentication middleware.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
module.exports = function userIdAuth(req, res, next) {
  req.log.debug(`Enter userIdAuth middleware`);

  const bearerUserId = 'Bearer userId_';

  if (!req.headers.authorization ||
    !req.headers.authorization.startsWith(bearerUserId) ||
    req.headers.authorization.length === bearerUserId.length) {
    res.status(403)
      .json(util.wrapErrorResponse(req.id, 403, 'No userId provided.'));
    return res.send();
  }

  const userId = req.headers.authorization.split(bearerUserId)[1];

  req.log.debug(`Get m2m token`);

  m2m.getMachineToken(config.AUTH0_CLIENT_ID, config.AUTH0_CLIENT_SECRET)
    .then((token) => {
      req.log.debug(`Get topcoder user from identity service, userId = ${userId}`);

      return util.getTopcoderUser(userId, token, req.log)
        .then((user) => {
          if (!user) {
            res.status(403)
              .json(util.wrapErrorResponse(req.id, 403, 'User does not exist.'));
            return res.end();
          }

          if (user.active) {
            res.status(403)
              .json(util.wrapErrorResponse(req.id, 403, 'User is not inactive.'));
            return res.end();
          }

          // Store user into the request
          req.authUser = user;
          req.authUser.userId = user.id;
          req.authUser.roles = req.authUser.roles || [];
          req.log.debug('req.authUser=>', req.authUser);

          return next();
        });
    })
    .catch((err) => {
      req.log.error('Failed to get m2m token', err);
      next(err);
    });
};
