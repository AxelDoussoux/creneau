import { HttpInterceptorFn } from '@angular/common/http';
import { demoBackendInterceptor } from './demo-backend';

/** Build `demo` (GitHub Pages) : l'API est simulée dans le navigateur. */
export const demoInterceptors: HttpInterceptorFn[] = [demoBackendInterceptor];
