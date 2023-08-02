import { Component } from '@angular/core';
import { Router } from '@angular/router';
import firebase from 'firebase/compat/app';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  constructor(private router:Router) {
  }
  ngOnInit(): void {
    firebase.initializeApp(environment.firebase);
    this.router.navigateByUrl("splash");
  }
}
