## keboola-developer-portal

Application based on Serverless framework utilizing AWS Lamda, API Gateway and Cognito services.


### Status

[![Build Status](https://travis-ci.org/keboola/developer-portal.svg?branch=master)](https://travis-ci.org/keboola/developer-portal)


### Installation

1. Checkout git repository: `git clone git@github.com:keboola/developer-portal.git`
2. Cd into directory: `cd developer-portal`
3. Install npm dependencies: `npm install`
4. AWS Setup (so far has to be manual)
    1. Verify email address used as sender for emails in SES console
        - Save the email to Serverless variable `sesEmail` (using command `sls variables set`)
    2. Create Cognito User Pool in AWS console
        - Add email sender to `FROM` in section `Verifications`
        - Save Cognito pool id to sls variable `cognitoUserPoolId`
        - Create app in section `Apps`
            - Do **not** generate client secret
            - Enable sign-in API for server-based authentication
            - Add `profile` to `Writable Attributes`
            - Save client id to sls variable `cognitoUserPoolClientId`
    3. Create S3 bucket for app icons and save it to sls variable `iconsS3Bucket`
        - Put bucket's public url to sls variable `iconsPublicFolder`
    4. Create Myql 5.7 RDS
        - Put it's credentials to sls variables `rdsHost`, `rdsUser`, `rdsPassword` and `rdsDatabase`
5. Deploy all resources using command `sls dash deploy`
6. Extend created IAM policy for lambda functions with these statements: 
```
{
  "Effect": "Allow",
  "Action": ["s3:PutObject", "s3:GetObject", "s3:ReplicateObject"],
  "Resource": "arn:aws:s3:::${icons_s3_bucket}/*"
},
{
  "Effect": "Allow",
  "Action": ["ses:SendEmail"],
  "Resource": "*"
},
{
  "Effect": "Allow",
  "Action": ["cognito-identity:*", "cognito-idp:*],
  "Resource": "${cognito_user_pool_arn}"
}
```