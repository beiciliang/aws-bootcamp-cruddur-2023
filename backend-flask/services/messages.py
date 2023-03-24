from datetime import datetime, timedelta, timezone
from lib.ddb import Ddb
from lib.db import db


class Messages:
    def run(message_group_uuid, cognito_user_id):
        model = {
            'errors': None,
            'data': None
        }

        sql = db.template('users', 'uuid_from_cognito_user_id')
        my_user_uuid = db.query_value(sql, {
            'cognito_user_id': cognito_user_id
        })

        print(f"UUID: {my_user_uuid}")

        ddb = Ddb.client()
        data = Ddb.list_messages(ddb, message_group_uuid)
        print("list_messages")
        print(data)
        model['data'] = data
        return model
