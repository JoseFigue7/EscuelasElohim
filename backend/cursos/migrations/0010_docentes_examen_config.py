from django.conf import settings
from django.db import migrations, models


def copiar_docente_a_docentes(apps, schema_editor):
    Promocion = apps.get_model('cursos', 'Promocion')
    for promocion in Promocion.objects.exclude(docente_id=None):
        promocion.docentes.add(promocion.docente_id)


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('cursos', '0009_material_tipo_enlace_imagen'),
    ]

    operations = [
        migrations.AddField(
            model_name='examen',
            name='permitir_recuperacion',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='examen',
            name='porcentaje_aprobacion',
            field=models.PositiveIntegerField(default=70),
        ),
        migrations.AddField(
            model_name='examen',
            name='recuperacion_incluye_no_realizados',
            field=models.BooleanField(
                default=False,
                help_text='Si está activo, la recuperación también aplica a quienes no hicieron el examen',
            ),
        ),
        migrations.AddField(
            model_name='promocion',
            name='docentes',
            field=models.ManyToManyField(
                blank=True,
                limit_choices_to={'tipo__in': ['docente', 'admin']},
                related_name='promociones_asignadas',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.RunPython(copiar_docente_a_docentes, migrations.RunPython.noop),
    ]
