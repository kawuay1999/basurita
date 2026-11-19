import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

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
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.loginForm.value).subscribe({
      next: (res: any) => {
        // Usamos tus métodos personalizados
        this.authService.saveSession(res.token, res.user);
        // Primero el permiso de ubicación; esa pantalla manda a cada rol a su inicio
        this.router.navigate(['/permiso-ubicacion']);
      },
      error: () => {
        this.isLoading = false;
        // RNF-23: Error amigable
        this.errorMessage = 'Correo o contraseña incorrectos. Por favor, intenta de nuevo.';
      }
    });
  }
}