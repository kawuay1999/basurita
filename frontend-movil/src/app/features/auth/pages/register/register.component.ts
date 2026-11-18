import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonComponent],
  templateUrl: './register.component.html'
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  
  // Simulando carga de colonias (Esto luego puede venir de un ColoniasService)
  colonias = [
    { id: 1, nombre: 'Centro Histórico' },
    { id: 2, nombre: 'Villas del Sol' },
    { id: 3, nombre: 'Hacienda Real' }
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      colonia_id: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      role: ['ciudadano'] // Forzamos el rol desde el frontend
    });
  }

  ngOnInit(): void {}

  onSubmit() {
    if (this.registerForm.invalid) {
      this.errorMessage = 'Por favor, completa todos los campos correctamente.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.register(this.registerForm.value).subscribe({
      next: (res: any) => {
        this.authService.saveSession(res.token, res.user);
        this.router.navigate(['/ciudadano/mapa']);
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Ocurrió un error al registrarte. Verifica que el correo no esté en uso.';
      }
    });
  }
}