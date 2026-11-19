import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { switchMap } from 'rxjs';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonComponent],
  templateUrl: './register.component.html'
})
export class RegisterComponent {
  registerForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false; // Ojito para mostrar/ocultar contraseña

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    // La ubicación de la casa se elige en el mapa después de iniciar sesión,
    // por eso aquí ya no se pide la colonia.
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.errorMessage = 'Por favor, completa todos los campos correctamente.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { email, password } = this.registerForm.value;

    // El registro no devuelve token: al terminar, iniciamos sesión con las mismas credenciales
    this.authService.register(this.registerForm.value).pipe(
      switchMap(() => this.authService.login({ email, password }))
    ).subscribe({
      next: (res: any) => {
        this.authService.saveSession(res.token, res.user);
        // Siguiente paso: pedir permiso de ubicación y elegir su casa
        this.router.navigate(['/permiso-ubicacion']);
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err?.status === 422
          ? 'Ese correo ya está registrado o algún dato no es válido.'
          : 'Ocurrió un error al registrarte. Intenta de nuevo.';
      }
    });
  }
}
