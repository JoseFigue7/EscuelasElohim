from django.core.management.base import BaseCommand
from cursos.models import Curso


class Command(BaseCommand):
    help = 'Carga los datos iniciales (los 3 cursos básicos)'

    def handle(self, *args, **options):
        cursos = [
            {
                'nombre': 'Escuela de Corderitos',
                'descripcion': 'Curso para niños - Escuela de Corderitos'
            },
            {
                'nombre': 'Doctrina Intermedia',
                'descripcion': 'Curso de doctrina intermedia'
            },
            {
                'nombre': 'Escuela de Evangelismo',
                'descripcion': 'Curso de evangelismo'
            }
        ]
        
        for curso_data in cursos:
            curso, created = Curso.objects.get_or_create(
                nombre=curso_data['nombre'],
                defaults={'descripcion': curso_data['descripcion']}
            )
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Curso creado: {curso.nombre}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'○ Curso ya existe: {curso.nombre}')
                )
        
        self.stdout.write(
            self.style.SUCCESS('\n✓ Datos iniciales cargados correctamente')
        )


