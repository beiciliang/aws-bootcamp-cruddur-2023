# Week 4 — Postgres and RDS

Based on what I've done in [week3](https://github.com/beiciliang/aws-bootcamp-cruddur-2023/blob/main/journal/week3.md), gitpod the branch of [week-3](https://github.com/beiciliang/aws-bootcamp-cruddur-2023/tree/week-3) and do the following steps (in the end, changes are committed to the branch of [week-4](https://github.com/beiciliang/aws-bootcamp-cruddur-2023/tree/week-4) and then merged to the main branch):

- [RDS DB Instance on AWS](#rds-db-instance-on-aws)
- [Bash Scripts and SQL for Postgres Operations](#bash-scripts-and-sql-for-postgres-operations)
- [Implement a Postgres Client](#implement-a-postgres-client)
- [AWS Lambda for Cognito Post Confirmation](#aws-lambda-for-cognito-post-confirmation)
- [Create Activities](#create-activities)

## RDS DB Instance on AWS

We can create a new database with PostgreSQL engine via the AWS console for RDS, or use the following command line:

```sh
aws rds create-db-instance \
  --db-instance-identifier cruddur-db-instance \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version  14.6 \
  --master-username cruddurroot \
  --master-user-password <HIDDEN_PASSWORD> \
  --allocated-storage 20 \
  --availability-zone us-east-1a \
  --backup-retention-period 0 \
  --port 5432 \
  --no-multi-az \
  --db-name cruddur \
  --storage-type gp2 \
  --publicly-accessible \
  --storage-encrypted \
  --enable-performance-insights \
  --performance-insights-retention-period 7 \
  --no-deletion-protection
```

A RDS instance named `cruddur-db-instance` is created. According to the above `master-username`, `master-user-password`, `port`, `db-name`, and the endpoint shown on the AWS console, we can decide `PROD_CONNECTION_URL` and export it by:

```sh
export PROD_CONNECTION_URL='postgresql://<master-username>:<master-user-password>@<aws-rds-endpoint>:<port>/<db-name>'
gp env PROD_CONNECTION_URL='postgresql://<master-username>:<master-user-password>@<aws-rds-endpoint>:<port>/<db-name>'
```

In order to let our gitpod workspace connect to the RDS instance remotely, we need to edit the inbound rules of the RDS instance's VPC security groups by allowing gitpod's IP (check by command `curl ifconfig.me`) to reach port 5432 for PostgreSQL. When it's done, AWS console is shown as the screenshot below.

![Proof of rds security group](assets/week04-rds-security-group.png)

we can have the IDs for the security group and the security group rule respectively. Since gitpod's IP is changed whenever a new workspace is created, we can use the following command line to always let the current IP connect to the RDS instance remotely.

```sh
export DB_SG_ID=<YOUR_ID_FOR_THE_SECURITY_GROUP>
gp env DB_SG_ID=<YOUR_ID_FOR_THE_SECURITY_GROUP>
export DB_SG_RULE_ID=<YOUR_ID_FOR_THE_SECURITY_GROUP_RULE>
gp env DB_SG_RULE_ID=<YOUR_ID_FOR_THE_SECURITY_GROUP_RULE>

aws ec2 modify-security-group-rules \
    --group-id $DB_SG_ID \
    --security-group-rules "SecurityGroupRuleId=$DB_SG_RULE_ID,SecurityGroupRule={IpProtocol=tcp,FromPort=5432,ToPort=5432,CidrIpv4=$GITPOD_IP/32}"
```

We can write the above command into `backend-flask/bin/rds-update-sg-rule`, and add command for postgres in `.gitpod.yml` as seen in [this commit](https://github.com/beiciliang/aws-bootcamp-cruddur-2023/commit/24c7fb96ed7cad7abd77bb0775bb8acf69144120) and [this commit](https://github.com/beiciliang/aws-bootcamp-cruddur-2023/commit/c4344adae9b75746c6ac8949a64ddde0e029b237), such that every time we launch a gitpod workspace, these commands can be automatically completed.

## Bash Scripts and SQL for Postgres Operations

To work with the local Postgres, we need to specify the `CONNECTION_URL`:

```sh
export CONNECTION_URL="postgresql://postgres:password@localhost:5432/cruddur"
gp env CONNECTION_URL="postgresql://postgres:password@localhost:5432/cruddur"
```

As seen in [this commit](https://github.com/beiciliang/aws-bootcamp-cruddur-2023/commit/46f021985c802fb1cce72d1867cbcfd8475a402d) and [this commit](https://github.com/beiciliang/aws-bootcamp-cruddur-2023/commit/dd96dcde1b38d95f09d12b761a56b21ce99789f9), we work on the following things:

- Write several bash scripts for database operations including `db-connect`, `db-create`, `db-drop`, `db-schema-load`, `db-seed`, `db-sessions`, and `db-setup` saved in `backend-flask/bin/` (use command `chmod u+x <PATH_OF_SCRIPT>` so the script is executable)
- Create SQL files that work with UUIDs and PSQL extensions including `schema.sql` and `seed.sql` saved in `backend-flask/db/`
- Operate common SQL commands as seen in the screenshots below, after running 3 bash scripts, a database named `cruddur` is created, two tables named `users` and `activities` are created and inserted with mock data

![Proof of database operations](assets/week04-database-operations.png)

![Proof of SQL commands](assets/week04-sql-commands.png)

If we need to connect to the AWS RDS instance, we can do `./bin/db-connect prod`, so as for the other bash scripts.

## Implement a Postgres Client

As seen in [this commit](https://github.com/beiciliang/aws-bootcamp-cruddur-2023/commit/ff1b9254ee2c9250f053ff17e434815a1ac5ef6b), we can replace the mock data with querying the data from our database using SQL, so that the activities shown on the home page is from the database. This is mainly than by implement a postgres client for python using a connection pool.

- Add `psycopg[binary]` and `psycopg[pool]` to `backend-flask/requirements.txt`
- Set the environment variable `CONNECTION_URL: "postgresql://postgres:password@db:5432/cruddur"` for our backend-flask application in `docker-compose.yml`
- Create `backend-flask/lib/db.py` for DB object and connection pool
- Replace our mock endpoint with real api call in `backend-flask/services/home_activities.py`

After composing up the docker, we can see that the home page shows the activity specified in the `backend-flask/db/seed.sql`, instead of our previous mock data.

![Proof of postgres client](assets/week04-postgres-client.png)

## AWS Lambda for Cognito Post Confirmation

In the production mode that we work with the AWS RDS instance instead of local postgres, when there is a new user signed up, the user should be inserted into the table of users. We can implement a AWS Lambda that runs in a VPC and commits code to RDS.

As seen in [this commit](https://github.com/beiciliang/aws-bootcamp-cruddur-2023/commit/11f2c91073dcfba165508eb6e3c28d15a9d1e332), we need to:

- In AWS Lambda, create a Lambda function named `cruddur-post-confirmation`, and deploy the code source as seen in `aws/lambdas/cruddur-post-confirrmation.py`
- In the environment variables under the configuration tab, add a new one where the key is `CONNECTION_URL` and the value equals to our `PROD_CONNECTION_URL`
- Due to AWS Lambda missing the required PostgreSQL libraries in the AMI image, we needed to compile psycopg2 with the PostgreSQL libpq.so library statically linked libpq library instead of the default dynamic link. To make it simple, we can add a layer for psycopg2 by specifying an ARN selected from [this link](https://github.com/jetbridge/psycopg2-lambda-layer). In my case, I used `arn:aws:lambda:us-east-1:898466741470:layer:psycopg2-py38:2`
- In Amazon Cognito > User pools > cruddur-user-pool, add lambda trigger under the user pool properties tab, where the trigger type is sign-up post confirmation, and the lambda function is assigned with our `cruddur-post-confirmation`; delete the existing user so we can later sign up again and see if it's inserted into our RDS instance's users table.
- In AWS Lambda's configurations tab, add permissions to the execution role, so it can access EC2. This can be done by creating a policy named `AWSLambdaVPCAccessExecutionRole` in IAM > Policies, where the policy is specified by [json](https://stackoverflow.com/questions/41177965/aws-lambdathe-provided-execution-role-does-not-have-permissions-to-call-describ). Then we can add permissions to the execution role by attaching the created policy as seen in the screenshot below.
- In AWS Lambda's configurations tab, edit VPC so that Lambda is connected with the VPC to access the RDS instance. Then the page is shown as the screenshot below.

![Proof of AWSLambdaVPCAccessExecutionRole](assets/week04-AWSLambdaVPCAccessExecutionRole.png)

![Proof of lambda vpc](assets/week04-lambda-vpc.png)

In our source code:

- Change the backend environment to `CONNECTION_URL: "${PROD_CONNECTION_URL}"` in `docker-compose.yml`
- Change the users schema in `backend-flask/db/schema.sql`

Now run command `./bin/db-schema-load prod`, compose up the dockers and sign up again, run command `./bin/db-connect prod` and other sql commands to check if the newly sign-up user has been inserted into the users table of our RDS instance. As shown in the screenshot below, it runs successfully with our Lambda function for Cognito post confirmation.

![Proof of lambda vpc](assets/week04-lambda-success.png)

We can also check the logs at CloudWatch > Log groups > /aws/lambda/cruddur-post-confirmation as shown in the screenshot below.

![Proof of lambda vpc](assets/week04-lambda-logs.png)

## Create Activities

Now the activities table of our RDS instance is empty. To insert the created activities into the table, we need to work with PSQL json functions to directly return json from the database, and correctly sanitize parameters passed to SQL to execute.

As seen in [this commit](https://github.com/beiciliang/aws-bootcamp-cruddur-2023/commit/c4aa4048aed63cedd47d264612f30897a4098212) and [this commit](https://github.com/beiciliang/aws-bootcamp-cruddur-2023/commit/2080b2affdfd1efa3dd471f7f8b2845b1faf47fd):

- Refactor the db library in `backend-flask/lib/db.py`
- Change `backend-flask/services/create_activity.py` and `backend-flask/services/home_activities.py` to execute SQL commands and save the results for display
- Related SQL commands are saved in `create.sql`, `home.sql`, and `object.sql` under `backend-flask/db/sql/activities/`

If the user signs in and creates an activity now, the backend shows uuid none error. A temporary fix is to change the value of `user_handle` to the username of the sign-in user in `backend-flask/app.py`. In my case, it is `user_handle = 'beiciliang'` as seen in [this commit](https://github.com/beiciliang/aws-bootcamp-cruddur-2023/commit/67c2a277af11edbe4061e6b9e6f136afe1424334). Now I can successfully create three activities with different expire time as shown in the screenshot below. (UPDATE: instead of hard-coded `user_handle`, in [this commit](https://github.com/beiciliang/aws-bootcamp-cruddur-2023/commit/0eef44dbc83ff2f34ed496a5bc3c7de052c0f1f2), we managed to pass this from the frontend to route of `/api/activities`.)

![Proof of create activity](assets/week04-create-activity.png)

After creating three activities, run command `./bin/db-connect prod` and check the data inserted into the activities table by SQL command `SELECT * FROM activities`. Results are shown as the screenshot below.

![Proof of sql activity](assets/week04-sql-activity.png)
