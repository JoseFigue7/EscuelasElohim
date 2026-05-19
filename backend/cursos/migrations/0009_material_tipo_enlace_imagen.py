from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cursos', '0008_tema_visible_para_estudiante'),
    ]

    operations = [
        migrations.AddField(
            model_name='material',
            name='tipo',
            field=models.CharField(
                choices=[('archivo', 'Archivo'), ('enlace', 'Enlace'), ('imagen', 'Imagen')],
                default='archivo',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='material',
            name='url',
            field=models.URLField(blank=True, max_length=500, null=True),
        ),
        migrations.AlterField(
            model_name='material',
            name='archivo',
            field=models.FileField(blank=True, null=True, upload_to='materiales/'),
        ),
    ]
