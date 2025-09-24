// Basic collections and types for Firebase functions
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACCESS_LEVELS = exports.PaymentStatus = exports.UserStatus = exports.COLLECTIONS = void 0;

exports.COLLECTIONS = {
    USERS: "users",
    SUBSCRIPTIONS: "subscriptions",
    USAGE: "usage",
    EVENTS: "events"
};

var UserStatus;
(function (UserStatus) {
    UserStatus["FREE"] = "free";
    UserStatus["PREMIUM"] = "premium";
    UserStatus["PAST_DUE"] = "past_due";
    UserStatus["GRACE_PERIOD"] = "grace_period";
    UserStatus["SUSPENDED"] = "suspended";
})(UserStatus = exports.UserStatus || (exports.UserStatus = {}));

var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["ACTIVE"] = "active";
    PaymentStatus["PAST_DUE"] = "past_due";
    PaymentStatus["CANCELED"] = "canceled";
    PaymentStatus["UNPAID"] = "unpaid";
})(PaymentStatus = exports.PaymentStatus || (exports.PaymentStatus = {}));

exports.ACCESS_LEVELS = {
    FREE: "free",
    PREMIUM: "premium"
};