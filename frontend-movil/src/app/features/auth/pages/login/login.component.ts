import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { mensajeDeError } from '../../utils/mensaje-error';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonComponent],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false; // Ojito para mostrar/ocultar contraseña

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      // El formato lo revisa el servidor: aquí se aceptan espacios o mayúsculas y se limpian al enviar
      email: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.errorMessage = 'Escribe tu correo y tu contraseña.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // El teclado del celular suele poner mayúscula al inicio o un espacio al final
    const credenciales = {
      email: (this.loginForm.value.email || '').trim().toLowerCase(),
      password: this.loginForm.value.password
    };

    this.authService.login(credenciales).subscribe({
      next: (res: any) => {
        // Usamos tus métodos personalizados
        this.authService.saveSession(res.token, res.user);
        // Primero el permiso de ubicación; esa pantalla manda a cada rol a su inicio
        this.router.navigate(['/permiso-ubicacion']);
      },
      error: (err: any) => {
        this.isLoading = false;
        // "Contraseña incorrecta" solo cuando el servidor lo dice; si no hay conexión, se avisa eso
        this.errorMessage = err?.status === 401
          ? 'Correo o contraseña incorrectos. Por favor, intenta de nuevo.'
          : mensajeDeError(err, 'No se pudo iniciar sesión. Intenta de nuevo.');
      }
    });
  }
}