const MainServerRouter = require("express").Router();

// Middleware
const authenticate = require("../../middlewares/authenticate");
const GDriveOauthClient = require("./../../middlewares/GDriveOauthClient");
const permissions = require('../../utils/rolePermConstants');
const checkRolePerms = require('../../middlewares/checkRolePermissions');
const rateLimit = require('../../middlewares/rateLimit');

// Policies
const UserPresentVerification = require ('./../../middlewares/UserPresentVerification')
const serverPolicy = require("../../policies/ServerPolicies");

// Create
MainServerRouter.route('/').post(
  authenticate(),
  rateLimit({name: 'create_server', expire: 60, requestsLimit: 10 }),
  serverPolicy.createServer,
  require("./createServer")
);

// Update
MainServerRouter.route('/:server_id').patch(
  authenticate(true),
  serverPolicy.updateServer,
  UserPresentVerification,
  require("./updateServer")
);

// Get Server
MainServerRouter.route('/:server_id').get(
  authenticate(true),
  UserPresentVerification,
  require("./getServer")
);

// Delete
MainServerRouter.route('/:server_id').delete(
  authenticate(),
  UserPresentVerification,
  rateLimit({name: 'delete_leave_server', expire: 60, requestsLimit: 10 }),
  require("./deleteLeaveServer")
);

// kick member
MainServerRouter.route('/:server_id/members/:unique_id').delete(
  authenticate(true),
  UserPresentVerification,
  checkRolePerms('Kick', permissions.KICK_USER),
  require("./kickMember")
);

// banned members
//http://192.168.1.8/api/servers/6583302963345756160/bans
MainServerRouter.route('/:server_id/bans').get(
  authenticate(true),
  UserPresentVerification,
  require("./bannedMembers")
)

// ban member
// http://192.168.1.8/api/servers/6583302963345756160/bans/184288888616859408
MainServerRouter.route('/:server_id/bans/:unique_id').put(
  authenticate(true),
  UserPresentVerification,
  checkRolePerms('Ban', permissions.BAN_USER),
  require("./banMember")
)

// un ban member
// http://192.168.1.8/api/servers/6583302963345756160/bans/184288888616859408
MainServerRouter.route('/:server_id/bans/:unique_id').delete(
  authenticate(true),
  UserPresentVerification,
  require("./unBanMember")
)


// Channels
MainServerRouter.use('/', require('./channels'));

// Invites
MainServerRouter.use('/', require('./invites'));

// roles
MainServerRouter.use('/', require('./roles'));



module.exports = MainServerRouter;
