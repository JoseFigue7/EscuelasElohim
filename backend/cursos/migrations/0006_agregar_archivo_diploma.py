from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cursos', '0005_agregar_recuperaciones'),
    ]

    operations = [
        migrations.AddField(
            model_name='diploma',
            name='archivo',
            field=models.FileField(blank=True, null=True, upload_to='diplomas/'),
        ),
    ]

