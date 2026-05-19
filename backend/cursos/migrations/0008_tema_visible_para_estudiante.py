from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cursos', '0007_agregar_fecha_validez_diploma'),
    ]

    operations = [
        migrations.AddField(
            model_name='tema',
            name='visible_para_estudiante',
            field=models.BooleanField(
                default=True,
                help_text='Si está desactivado, el tema no se muestra a los estudiantes',
            ),
        ),
    ]
