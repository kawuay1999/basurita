import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { switchMap } from 'rxjs';
import { mensajeDeError } from '../../utils/mensaje-error';

// Correo con usuario, @, dominio y terminación (.com, .mx, .com.mx...): sirve para Gmail, Hotmail, Outlook, Yahoo, institucionales, etc.
const PATRON_CORREO = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
// Nombre: letras (con acentos y ñ), espacios, punto, guion y apóstrofo
const PATRON_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$/;

// Errores comunes al escribir el dominio → sugerencia
const DOMINIOS_CORREGIDOS: Record<string, string> = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gamil.com': 'gmail.com',
  'gmail.con': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.cm': 'gmail.com', 'gnail.com': 'gmail.com',
  'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'hotmal.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com', 'otmail.com': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outlook.con': 'outlook.com', 'yaho.com': 'yahoo.com', 'yahoo.con': 'yahoo.com',
  'icloud.con': 'icloud.com'
};

/** Contraseña: mínimo 8, con mayúscula, minúscula y número. */
function contrasenaSegura(control: AbstractControl): ValidationErrors | null {
  const v: string = control.value || '';
  if (!v) return null; // "required" se encarga
  const faltan: ValidationErrors = {};
  if (v.length < 8) faltan['largo'] = true;
  if (!/[A-Z]/.test(v)) faltan['mayuscula'] = true;
  if (!/[a-z]/.test(v)) faltan['minuscula'] = true;
  if (!/[0-9]/.test(v)) faltan['numero'] = true;
  return Object.keys(faltan).length ? faltan : null;
}

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
  showPassword = false;
  intentoEnviar = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    // La ubicación de la casa se elige en el mapa después de iniciar sesión.
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80), Validators.pattern(PATRON_NOMBRE)]],
      email: ['', [Validators.required, Validators.maxLength(120), Validators.pattern(PATRON_CORREO)]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      password: ['', [Validators.required, contrasenaSegura]]
    });
  }

  // ---------- Requisitos de la contraseña (lista que se pone en verde) ----------
  get requisitos() {
    const v: string = this.registerForm.get('password')?.value || '';
    return [
      { texto: 'Mínimo 8 caracteres', ok: v.length >= 8 },
      { texto: 'Una letra mayúscula', ok: /[A-Z]/.test(v) },
      { texto: 'Una letra minúscula', ok: /[a-z]/.test(v) },
      { texto: 'Un número', ok: /[0-9]/.test(v) }
    ];
  }

  /** Muestra el error del campo si ya lo tocó o si intentó crear la cuenta. */
  mostrarError(campo: string): boolean {
    const c = this.registerForm.get(campo);
    return !!c && c.invalid && (c.touched || this.intentoEnviar);
  }

  error(campo: string): string {
    const c = this.registerForm.get(campo);
    if (!c?.errors) return '';
    const e = c.errors;
    const valor: string = c.value || '';

    switch (campo) {
      case 'name':
        if (e['required']) return 'Escribe tu nombre completo.';
        if (e['pattern']) return 'El nombre solo puede llevar letras y espacios.';
        if (e['minlength']) return 'El nombre debe tener al menos 3 letras.';
        if (e['maxlength']) return 'El nombre es demasiado largo.';
        break;
      case 'email':
        if (e['required']) return 'Escribe tu correo electrónico.';
        if (!valor.includes('@')) return 'Al correo le falta la @ (ejemplo: juan@gmail.com).';
        if (!/@.+\..+/.test(valor)) return 'Al correo le falta la terminación (ejemplo: @gmail.com, @hotmail.com).';
        return 'El correo no es válido. Revisa que esté bien escrito (ejemplo: juan@gmail.com).';
      case 'phone': {
        if (e['required']) return 'Escribe tu teléfono a 10 dígitos.';
        const faltan = 10 - valor.length;
        if (faltan > 0) return `El teléfono debe tener 10 dígitos: ${faltan === 1 ? 'te falta 1 número' : `te faltan ${faltan} números`}.`;
        return 'El teléfono debe tener exactamente 10 dígitos.';
      }
      case 'password': {
        if (e['required']) return 'Crea una contraseña.';
        const falta: string[] = [];
        if (e['largo']) falta.push(`${Math.max(0, 8 - valor.length)} caracteres más`);
        if (e['mayuscula']) falta.push('una mayúscula');
        if (e['minuscula']) falta.push('una minúscula');
        if (e['numero']) falta.push('un número');
        return `A tu contraseña le falta: ${falta.join(', ')}.`;
      }
    }
    return 'Revisa este dato.';
  }

  /** ¿Escribió mal el dominio? (gmial.com → gmail.com) */
  get sugerenciaCorreo(): string {
    const v: string = (this.registerForm.get('email')?.value || '').trim().toLowerCase();
    const [usuario, dominio] = v.split('@');
    if (!usuario || !dominio || !DOMINIOS_CORREGIDOS[dominio]) return '';
    return `${usuario}@${DOMINIOS_CORREGIDOS[dominio]}`;
  }

  usarSugerencia(): void {
    this.registerForm.get('email')?.setValue(this.sugerenciaCorreo);
  }

  /** Teléfono: solo números y máximo 10 (aunque peguen texto con espacios o guiones). */
  limpiarTelefono(event: Event): void {
    const input = event.target as HTMLInputElement;
    const limpio = input.value.replace(/\D/g, '').slice(0, 10);
    if (limpio !== input.value) input.value = limpio;
    this.registerForm.get('phone')?.setValue(limpio, { emitEvent: false });
  }

  onSubmit() {
    this.intentoEnviar = true;
    this.registerForm.markAllAsTouched();

    if (this.registerForm.invalid) {
      this.errorMessage = 'Revisa los campos marcados en rojo.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const datos = {
      ...this.registerForm.value,
      name: this.registerForm.value.name.trim().replace(/\s+/g, ' '),
      email: this.registerForm.value.email.trim().toLowerCase()
    };

    // El registro no devuelve token: al terminar, iniciamos sesión con las mismas credenciales
    this.authService.register(datos).pipe(
      switchMap(() => this.authService.login({ email: datos.email, password: datos.password }))
    ).subscribe({
      next: (res: any) => {
        this.authService.saveSession(res.token, res.user);
        this.router.navigate(['/permiso-ubicacion']);
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = mensajeDeError(err, 'Ocurrió un error al registrarte. Intenta de nuevo.');
      }
    });
  }
}
