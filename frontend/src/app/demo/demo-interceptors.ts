import { HttpInterceptorFn } from '@angular/common/http';

/** Build normal : aucune interception, l'application parle à la vraie API Spring Boot. */
export const demoInterceptors: HttpInterceptorFn[] = [];
