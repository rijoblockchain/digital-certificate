import {Component, Inject, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {TdLoadingService} from '@covalent/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';
import {AuthService} from "../../auth/auth.service";
import {IssueCertificateDialogService} from './issue-certificate-dialog.service';
//require('pdfmake');

@Component({
  selector: 'app-issue-certificate-dialog',
  templateUrl: './issue-certificate-dialog.component.html',
  styleUrls: ['./issue-certificate-dialog.component.css'],
  providers: [IssueCertificateDialogService]
})
export class IssueCertificateDialogComponent implements OnInit {

	issueCertificateForm: FormGroup;
	certID = new FormControl(null, Validators.required);
	administrator = new FormControl(this.authService.currentUser.email, Validators.required);
	
	recipientForm: FormGroup;
	recipientName = new FormControl(null, Validators.required);
	recipientEmail = new FormControl(null, Validators.required);
	recipientPK = new FormControl(null, Validators.required);
	studentId = new FormControl(null, Validators.required);
	recipientProgram = new FormControl(null, Validators.required);
	firstDate = new FormControl(null);
	lastDate = new FormControl(null);


	private Transaction;
	private errorMessage;
	private succesMessage;

	constructor(private serviceIssueCertificateDialog: IssueCertificateDialogService,
							private loadingService: TdLoadingService,
							private authService: AuthService,
							@Inject(FormBuilder) fb: FormBuilder,
							public dialogRef: MatDialogRef<IssueCertificateDialogComponent>,
							@Inject(MAT_DIALOG_DATA) public data) {
		
		this.recipientForm = fb.group({
			name: this.recipientName,
			email: this.recipientEmail,
			publicKey: this.recipientPK,
			studentId: this.studentId,
			program: this.recipientProgram,
			firstDate: this.firstDate,
			lastDate: this.lastDate,
		});

		this.issueCertificateForm = fb.group({
			certID: this.certID,
			administrator: this.administrator,
			recipient: this.recipientForm
		});
		this.administrator.disable();
	};

  ngOnInit() { }

	addAsset(): void {
		if (this.issueCertificateForm.valid) {
			let recipientInfo={};

			recipientInfo = {
				certId: this.certID.value,
				recipient: {
					email: this.recipientEmail.value,
				},
				recipientProfile: {
					name: this.recipientName.value,
					publicKey: this.recipientPK.value,
					studentId: this.studentId.value,
					assertions: {
						program: this.recipientProgram.value,
						firstDate: this.firstDate.value,
						lastDate: this.lastDate.value
					}
				}
			};


			this.Transaction = {
				$class: "org.degree.PersonalizeCertificate",
				'templateId': "resource:org.degree.CertificateTemplate#"+this.data.tempId,
				'localAdministrator': "resource:org.degree.Administrator#"+this.administrator.value,
				'recipientsInfo': recipientInfo
			};
			this.registerLoading();
			this.serviceIssueCertificateDialog.addTransaction(this.Transaction)
				.subscribe(() => {
					this.errorMessage = null;
					this.resolveLoading();
					this.closeDialog({update: true});
				}, (error) => {
					if (error === 'Server error') {
						this.errorMessage = 'Could not connect to REST server. Please check your configuration details';
					} else {
						this.errorMessage = error;
					}
					this.resolveLoading();
				});
		} else {
			Object.keys(this.issueCertificateForm.controls).forEach(field => {
				const control = this.issueCertificateForm.get(field);
				control.markAsTouched({ onlySelf: true });
				// console.log(field, control.errors);
			});
			Object.keys(this.recipientForm.controls).forEach(field => {
				const control = this.recipientForm.get(field);
				control.markAsTouched({ onlySelf: true });
				// console.log(field, control.errors);
			});
		}
	}

	closeDialog(data = { update: false }): void {
		this.dialogRef.close(data);
	}

	registerLoading(key: string = 'loading'): void {
		this.loadingService.register(key);
	}

	resolveLoading(key: string = 'loading'): void {
		this.loadingService.resolve(key);
	}

}
