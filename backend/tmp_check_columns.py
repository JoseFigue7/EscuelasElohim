import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE','elohimcoban.settings')
import django
django.setup()
from django.db import connection
cursor = connection.cursor()
cursor.execute("select column_name from information_schema.columns where table_name='cursos_diploma' order by ordinal_position")
print([row[0] for row in cursor.fetchall()])
