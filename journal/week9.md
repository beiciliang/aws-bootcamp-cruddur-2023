# Week 9 — CI/CD with CodePipeline, CodeBuild and CodeDeploy

Based on what I've done in previous [week8](https://github.com/beiciliang/aws-bootcamp-cruddur-2023/blob/main/journal/week8.md), open a new gitpod workspace and do the following steps (in the end, changes are committed to the branch of [week-9](https://github.com/beiciliang/aws-bootcamp-cruddur-2023/tree/week-9) and then merged to the main branch):

- [Preparation](#preparation)
- [AWS CodeBuild](#aws-codebuild)
- [AWS CodePipeline](#aws-codepipeline)
- [Test Pipeline](#test-pipeline)

## Preparation

Create the following two scripts:

- `backend-flask/buildspec.yml`, change the env variables to your owns ([code](https://github.com/beiciliang/aws-bootcamp-cruddur-2023/blob/week-9/backend-flask/buildspec.yml))
- `aws/policies/ecr-codebuild-backend-role.json` ([code](https://github.com/beiciliang/aws-bootcamp-cruddur-2023/blob/week-9/aws/policies/ecr-codebuild-backend-role.json))

Create a branch named `prod`, which will be used for AWS CodeBuild and CodePipeline later.

At AWS ECS, update desired tasks in the service to 1, if this was set to 0 before.

Before this week, if our backend is updated and needed to be deployed into production, we need to run `./bin/backend/build`, `./bin/backend/push`, and `./bin/backend/deploy`. With the following setup, this can be done in a CI/CD fashion.

## AWS CodeBuild

Create a build project:

- name as `cruddur-backend-flask-bake-image`, enable build badge
- source:
  - choose source provider as GitHub, repository in my GitHub account, select the `cruddur` repo, set source version to `prod`
  - select rebuild every time a code change is pushed to this repository, select single build, select event type as `PULL_REQUEST_MERGED`
- environment:
  - select managed image, select operating system as Amazon Linux 2, select standard runtime, select the latest image (4.0), select environment type as Linux, tick privileged
  - create a new service role automatically named as `codebuild-cruddur-backend-flask-bake-image-service-role`
  - decrease timeout to 20 min, don't select any certificate nor VPC, select compute as 3 GB memory and 2 vCPUs
- use a buildspec file `backend-flask/buildspec.yml`
- no artifects
- select cloudwatch logs, set group name as `/cruddur/build/backend-flask`, stream name as `backend-flask`

For the newly created service role, attach a policy as shown in `aws/policies/ecr-codebuild-backend-role.json` in order to grant more permissions. Then click "Start build" (or triggered by a merge to the `prod` branch). If succeeded, you can check the build history for details.

## AWS CodePipeline

Create a pipeline:

- name as `cruddur-backend-fargate`, allow to create a new service role automatically named as `AWSCodePipelineServiceRole-us-east-1-cruddur-backend-fargate`, select default location and default managed key in advanced settings
- source stage from GitHub (Version 2), click "Connect to GitHub", set connection name as `cruddur`, install a new app, select the cruddur repo, in the end finish "Connect to GitHub" and back to the pipeline page
- select the cruddur repo and select branch `prod`, select "start the pipeline on source code change" and default output artifact format
- for build stage, select AWS CodeBuild as build provider, select your region, select the newly created project `cruddur-backend-flask-bake-image`
- for deploy stage, select ECS as deploy provide, choose `cruddur` cluster, `backend-flask` service

## Test Pipeline

Update `backend-flask/app.py` by changing the return in `health_check` function from `return {"success": True}, 200` to `return {"success": True, "ver": 1}, 200`.

Now merge this `week-9` branch to the `prod` branch. This will trigger the pipeline we created.

Go to `https://api.<domain_name>/api/health-check`, it will show `{"success":true,"ver":1}`.

Below is a screenshot that proofs my successful pipeline after merging pull request from `week-9`:

![Proof of CodePipline](assets/week09-codepipeline.png)
