import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => {
    console.error('Bootstrap error:', err);
    const errBox = document.getElementById('startup-error');
    if (errBox) {
      errBox.style.display = 'block';
      errBox.textContent = 'Ilovani yuklashda xatolik yuz berdi: ' + (err?.message || err);
    }
  });
