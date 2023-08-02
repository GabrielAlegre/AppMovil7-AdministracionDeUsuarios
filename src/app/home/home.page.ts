import { Component, OnInit, SimpleChanges } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { PhotoService } from '../services/photo.service';
import { QrscannerService } from '../services/qrscanner.service';
import { uploadString } from 'firebase/storage';
import { FirestoreService } from '../services/firestore.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  user: any = null;
  userAuth: any = this.angularFireAuth.authState;
  pressedButton: boolean = false;

  scanActive: boolean = false;

  form: FormGroup;

  newUser: any = {};
  usersList: any[] = [];
  content: string[];
  userPhoto: string = '../../assets/anonimo.png';

  isAdmin: boolean = false;
  formCreate: boolean = false;
  userList: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private qrScanner: QrscannerService,
    private angularFirestore: AngularFirestore,
    private angularFireAuth: AngularFireAuth,
    private formBuilder: FormBuilder,
    private photoService: PhotoService,
    private firestoreService: FirestoreService
  ) {
  }

  ngOnInit(): void {
    this.pressedButton = true;
    this.form = this.formBuilder.group({
      apellidos: ['', Validators.required],
      nombres: ['', Validators.required],
      dni: ['', Validators.required],
      correo: ['', Validators.required],
      clave1: ['', Validators.required],
      clave2: ['', Validators.required],
    });
    this.authService.user$.subscribe((user: any) => {
      if (user) {
        this.pressedButton = false;
        this.user = user;
        this.qrScanner.scanPrepare();
        this.userAuth = this.angularFireAuth.authState.subscribe((user) => {
          this.userAuth = user;
          console.log(this.userAuth);
          console.log(this.user);
        });
        if (this.user.userRol == 'admin') {
          this.isAdmin = true;
          this.formCreate = true;
          this.userList = false;
        } else {
          this.isAdmin = false;
          this.formCreate = false;
          this.userList = true;
        }
      }
    });
    this.firestoreService.getUsers().subscribe((users) => {
      this.usersList = users;
      this.usersList.sort(this.orderByLastName);
      console.log(this.usersList);
    });
  } // end of ngOnInit

  logoutUser() {
    this.authService.signOut();
    setTimeout(() => {
      this.isAdmin = false;
      this.formCreate = false;
      this.userList = false;
    }, 2100);
  } // end of logoutUser

  startScan() {
    this.pressedButton = true;
    setTimeout(() => {
      this.pressedButton = false;
      this.scanActive = true;
      this.qrScanner.startScan().then((result) => {
        this.content = result.split('@');
        this.form.setValue({
          apellidos:
            this.content[1].charAt(0) +
            this.content[1].slice(1).toLocaleLowerCase(),
          nombres:
            this.content[2].split(' ')[0].charAt(0) +
            this.content[2].split(' ')[0].slice(1).toLocaleLowerCase() +
            ' ' +
            this.content[2].split(' ')[1].charAt(0) +
            this.content[2].split(' ')[1].slice(1).toLocaleLowerCase(),
          dni: this.content[4],
          correo: this.form.getRawValue().correo,
          clave1: this.form.getRawValue().clave1,
          clave2: this.form.getRawValue().clave2,
        });
        this.authService.toast('DNI escaneado con éxito', 'success');
        this.scanActive = false;
      });
    }, 2000);
  } // end of startScan

  stopScan() {
    this.pressedButton = true;
    setTimeout(() => {
      this.pressedButton = false;
      this.scanActive = false;
      this.qrScanner.stopScanner();
    }, 2000);
  } // end of stopScan

  updateUser() {
    this.angularFirestore
      .doc<any>(`user/${this.userAuth.uid}`)
      .update({
        userCredit: this.user.userCredit,
        userEmail: this.user.userEmail,
        userId: this.user.userId,
        userName: this.user.userName,
        userQrCredit: this.user.userQrCredit,
        userRol: this.user.userRol,
        userSex: this.user.userSex,
      })
      .then(() => {})
      .catch((error) => {});
  } // end of updateUser

  createUser() {
    if (this.form.valid) {
      if (this.form.value.clave1 == this.form.value.clave2) {
        if (this.newUser.userPhoto) {
          this.newUser.userLastName = this.form.value.apellidos;
          this.newUser.userName = this.form.value.nombres;
          this.newUser.userDni = this.form.value.dni;
          this.newUser.userEmail = this.form.value.correo;
          this.newUser.userPassword = this.form.value.clave1;
          this.newUser.userUid = this.form.value.clave1;

          this.pressedButton = true;
          setTimeout(() => {
            this.authService
              .registerManagedUsers(this.newUser)
              .then((userCredential) => {
                this.form.reset();
                this.newUser.userUid = userCredential.user.uid;
                this.firestoreService.addUser(this.newUser);
                this.guardarUser(this.newUser);
                console.log(userCredential.user.uid);
                this.authService.toast(
                  '¡Usuario registrado con éxito!',
                  'success'
                );
                this.userPhoto = '../../assets/user-default.png';
              })
              .catch((error) => {
                console.log(error);
                this.authService.toast(
                    error,
                  'warning'
                );
              });
            this.pressedButton = false;
          }, 2000);
        } else {
          this.authService.toast('Debes cargar una foto', 'warning');
        }
      } else {
        this.authService.toast('Las claves deben coincidir', 'warning');
      }
    } else {
      this.authService.toast(
        'Debes completar todos los campos y luego cargar una foto',
        'warning'
      );
    }
  } // end of createUser


  guardarUser(usuario:any)
  {
    const collectionRef = this.angularFirestore.collection('user');
    const documentoID = usuario.userUid;
    const datosDocumento = {
      userEmail: usuario.userEmail,
      userId: '10',
      userName: usuario.userName,
      userRol: 'usuario',
      userSex: 'femenino',
      userUid: usuario.userUid,
      // ...
    };
  
    collectionRef.doc(documentoID).set(datosDocumento)
      .then(() => {
        console.log('Documento agregado con éxito');

      })
      .catch((error) => {
        console.log('Error al agregar el documento:', error);
      });
  }


  addPhotoToUser() {
    if (this.form.valid) {
      this.newUser = {
        userLastName: this.form.value.apellidos,
        userName: this.form.value.nombres,
        userDni: this.form.value.dni,
        userEmail: this.form.value.correo,
        userPassword: this.form.value.clave1,
        userPhoto: '',
      };

      this.pressedButton = true;
      setTimeout(() => {
        this.photoService.addNewToGallery(this.newUser).then((data) => {
          uploadString(data.storage, data.dataurl, 'data_url').then(() => {
            data.url.getDownloadURL().subscribe((url1: any) => {
              this.newUser.userPhoto = url1;
              this.userPhoto = url1;
              this.authService.toast('Foto Agregada!', 'success');
              this.pressedButton = false;
            });
          });
        });
      }, 2000);
    } else {
      this.authService.toast(
        'Debes completar todos los campos correctamente para seleccionar la foto',
        'warning'
      );
    }
    
  } // end of addPhotoToUser

  orderByLastName(a: any, b: any) {
    if (a.userLastName > b.userLastName) {
      return 1;
    } else if (a.userLastName < b.userLastName) {
      return -1;
    } else {
      return 0;
    }
  } // end of orderByLastName

  goToUsersList() {
    this.pressedButton = true;
    setTimeout(() => {
      this.formCreate = false;
      this.userList = true;
      this.pressedButton = false;
    }, 2000);
  } // end of goToUsersList

  goToCreateUser() {
    this.pressedButton = true;
    setTimeout(() => {
      this.formCreate = true;
      this.userList = false;
      this.pressedButton = false;
    }, 2000);
  } // end of goToCreateUser
}
