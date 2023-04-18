"use strict";
const { CognitoJwtVerifier } = require("aws-jwt-verify");
//const { assertStringEquals } = require("aws-jwt-verify/assert");

const jwtVerifier = CognitoJwtVerifier.create({
  userPoolId: process.env.USER_POOL_ID,
  tokenUse: "access",
  clientId: process.env.CLIENT_ID//,
  //customJwtCheck: ({ payload }) => {
  //  assertStringEquals("e-mail", payload["email"], process.env.USER_EMAIL);
  //},
});

exports.handler = async (event) => {
  console.log("request:", JSON.stringify(event, undefined, 2));

  // const jwt = event.headers.authorization;
  const auth = event.headers.authorization;
  const jwt = auth.split(" ")[1];

  try {
    const payload = await jwtVerifier.verify(jwt);
    console.log("Access allowed. JWT payload:", payload);
    return {
      isAuthorized: true,
      "context": {
          "sub": payload.sub
      },
    };    
  } catch (err) {
    console.error("Access forbidden:", err);
    return {
      isAuthorized: false,
    };
  }
};