from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cursos', '0006_agregar_archivo_diploma'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    "ALTER TABLE cursos_diploma ADD COLUMN IF NOT EXISTS fecha_validez date",
                    "ALTER TABLE cursos_diploma DROP COLUMN IF EXISTS fecha_validez",
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name='diploma',
                    name='fecha_validez',
                    field=models.DateField(blank=True, null=True),
                ),
            ],
        ),
    ]


