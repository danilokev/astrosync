import {
  Component,
  Input,
  ViewChild,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputSelectComponent } from '../../input-select/input-select.component';
import { ButtonComponent } from '../../button/button.component';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../services/user.service';
import { DialogComponent } from '../../dialog/dialog.component';
import { ToastService } from '../../../services/toast.service';

interface TableHeader {
  key: string;
  label: string;
}

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [
    CommonModule,
    InputSelectComponent,
    ButtonComponent,
    FormsModule,
    DialogComponent,
  ],
  templateUrl: './table.component.html',
  styleUrl: './table.component.css',
})
export class TableComponent {
  @Input() headers: TableHeader[] = [];
  @Input() data: Record<string, any>[] = [];
  @Output() userUpdated = new EventEmitter<void>();

  @ViewChild('deleteDialog') deleteDialog!: DialogComponent;
  @ViewChild('roleDialog') roleDialog!: DialogComponent;

  selectedUserId = '';
  selectedUserEmail = '';
  selectedUserName = '';
  newRole = '';
  currentRole = '';
  userEmail = '';
  userName = '';

  textObj = {};

  roleTextObj = {};

  constructor(
    private userService: UserService,
    private toastService: ToastService,
  ) {}

  onRoleChange(id: string, value: string) {
    const user = this.data.find((u) => u['uid'] === id);
    if (!user) return;

    const currentRole = user['rol'];

    if (currentRole === value) return;

    user['rol'] = value;
    this.selectedUserId = id;
    this.selectedUserEmail = user['email'];
    this.selectedUserName = user['nombre'] + ' ' + user['apellidos'];
    this.currentRole = currentRole;
    this.newRole = value;

    const currentLabel =
      this.currentRole === 'ROL_ADMIN' ? 'Administrador' : 'Usuario';
    const newLabel = this.newRole === 'ROL_ADMIN' ? 'Administrador' : 'Usuario';

    this.roleTextObj = {
      'Vas a ': false,
      cambiar: true,
      ' el rol de ': false,
      [this.selectedUserEmail]: true,
      ' (': true,
      [this.selectedUserName]: true,
      ') de ': false,
      [currentLabel]: true,
      ' a ': false,
      [newLabel]: true,
      '. ¿Quieres continuar?': false,
    };

    if (this.roleDialog) {
      (document.activeElement as HTMLElement)?.blur();
      this.roleDialog.open();
    }
  }

  confirmRoleChange() {
    if (!this.selectedUserId || !this.newRole) return;

    const data = { rol: this.newRole };

    this.userService.updateUser(this.selectedUserId, data).subscribe({
      next: () => {
        const userIndex = this.data.findIndex(
          (u) => u['uid'] === this.selectedUserId,
        );
        if (userIndex !== -1) {
          this.data[userIndex]['rol'] = this.newRole;
        }
        const roleLabel =
          this.newRole === 'ROL_ADMIN' ? 'Administrador' : 'Usuario';
        this.toastService.success(
          'Rol actualizado',
          `El rol de ${this.selectedUserEmail} ha sido cambiado a ${roleLabel}.`,
        );
        this.userUpdated.emit();
      },
      error: () => {
        this.toastService.error(
          'Error',
          'No se ha podido actualizar el rol del usuario. Inténtalo de nuevo.',
        );
      },
    });
  }

  cancelRoleChange() {
    const user = this.data.find((u) => u['uid'] === this.selectedUserId);
    if (user) {
      user['rol'] = this.currentRole;
    }
  }

  deleteUser() {
    this.userService.deleteUser(this.selectedUserId).subscribe({
      next: (response) => {
        // console.log('Usuario borrado', response);
        this.data = this.data.filter(
          (item) => item['uid'] !== this.selectedUserId,
        );
        this.toastService.success(
          'Usuario eliminado',
          `El usuario ${this.userName} ha sido eliminado correctamente.`,
        );
        this.userUpdated.emit();
      },
      error: (error) => {
        // console.error('Error al borrar el usuario', error);
        this.toastService.error(
          'Error',
          'No se ha podido eliminar el usuario. Inténtalo de nuevo.',
        );
      },
    });
  }

  openDeleteDialog(
    userId: string,
    email: string,
    name: string,
    secondNames: string,
  ) {
    this.selectedUserId = userId;
    this.userEmail = email;
    this.userName = name + ' ' + secondNames;

    this.textObj = {
      'Vas a ': false,
      eliminar: true,
      ' al usuario ': false,
      [this.userEmail]: true,
      ' (': true,
      [this.userName]: true,
      ') permanentemente.': true,
      'Esta acción no se puede deshacer. ¿Quieres continuar?': false,
    };

    if (this.deleteDialog) {
      (document.activeElement as HTMLElement)?.blur();
      this.deleteDialog.open();
    }
  }
}
