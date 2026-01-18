from django.core.management.base import BaseCommand, CommandError

from cursos.models import CalificacionExamen, Examen, Inscripcion, Promocion, PromedioPromocion
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = (
        "Reasigna calificaciones de un alumno a la inscripcion correcta por promocion "
        "y recalcula su promedio."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--alumno",
            required=True,
            help="Username o email del alumno (ej: test3).",
        )
        parser.add_argument(
            "--promocion",
            required=True,
            help='Nombre de la promocion (ej: "escuela de corderitos").',
        )
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Aplica los cambios. Sin este flag, solo muestra el resultado.",
        )

    def handle(self, *args, **options):
        alumno_value = options["alumno"]
        promocion_name = options["promocion"]
        apply_changes = options["apply"]

        User = get_user_model()
        alumno = (
            User.objects.filter(username__iexact=alumno_value).first()
            or User.objects.filter(email__iexact=alumno_value).first()
        )
        if not alumno:
            raise CommandError("No se encontro el alumno indicado.")

        promocion = Promocion.objects.filter(nombre__iexact=promocion_name).first()
        if not promocion:
            raise CommandError("No se encontro la promocion indicada.")

        inscripcion_correcta = Inscripcion.objects.filter(
            alumno=alumno, promocion=promocion
        ).first()
        if not inscripcion_correcta:
            raise CommandError("El alumno no tiene inscripcion en esa promocion.")

        examenes = Examen.objects.filter(tema__curso=promocion.curso)
        calificaciones = CalificacionExamen.objects.filter(
            inscripcion__alumno=alumno, examen__in=examenes
        ).select_related("inscripcion")

        if not calificaciones.exists():
            self.stdout.write(self.style.WARNING("No hay calificaciones para mover."))
            return

        incorrectas = [
            calificacion
            for calificacion in calificaciones
            if calificacion.inscripcion_id != inscripcion_correcta.id
        ]

        if not incorrectas:
            self.stdout.write(self.style.SUCCESS("Todas las calificaciones ya estan correctas."))
        else:
            self.stdout.write(
                f"Calificaciones a reasignar: {len(incorrectas)} "
                f"(inscripcion correcta: {inscripcion_correcta.id})"
            )
            for calificacion in incorrectas:
                self.stdout.write(
                    f"- Calificacion {calificacion.id}: examen {calificacion.examen_id}, "
                    f"inscripcion actual {calificacion.inscripcion_id}"
                )

            if apply_changes:
                for calificacion in incorrectas:
                    calificacion.inscripcion = inscripcion_correcta
                    calificacion.save(update_fields=["inscripcion"])
                self.stdout.write(self.style.SUCCESS("Reasignacion completada."))
            else:
                self.stdout.write("Dry-run: no se aplicaron cambios.")

        promedio, _created = PromedioPromocion.objects.get_or_create(
            inscripcion=inscripcion_correcta
        )
        promedio.calcular_promedio()
        self.stdout.write(
            self.style.SUCCESS(
                f"Promedio recalculado: {float(promedio.promedio_final):.2f}% "
                f"(aprobado={promedio.aprobado})"
            )
        )

