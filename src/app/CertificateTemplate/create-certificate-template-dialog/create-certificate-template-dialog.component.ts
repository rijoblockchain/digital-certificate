import {Component, Inject, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {CertificateTemplateService} from '../CertificateTemplate.service';
import {TdLoadingService} from '@covalent/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';
import {AuthService} from "../../auth/auth.service";

@Component({
  selector: 'app-create-certificate-template-dialog',
  templateUrl: './create-certificate-template-dialog.component.html',
  styleUrls: ['./create-certificate-template-dialog.component.css'],
	providers: [CertificateTemplateService]
})
export class CreateCertificateTemplateDialogComponent implements OnInit {
	

	certificateTemplateForm: FormGroup;
	templateId = new FormControl(null, Validators.required);
	templateImage = new FormControl(null, Validators.required);
	globalAdministrator = new FormControl(this.authService.currentUser.email, Validators.required);
	// typeC = new FormControl(null, Validators.required);
	// context = new FormControl(null, Validators.required);
	// revoked = new FormControl(null, Validators.required);

	courseForm: FormGroup;
	courseId = new FormControl(null, Validators.required);
	courseName = new FormControl(null, Validators.required);
	courseDescription = new FormControl(null, Validators.required);
	courseImage = new FormControl(null);
	courseCriteria = new FormControl(null);

	issuerForm: FormGroup;
	issuerId = new FormControl(null, Validators.required);
	issuerName = new FormControl(null, Validators.required);
	issuerUrln = new FormControl(null, Validators.required);
	issuerEmail = new FormControl(null, Validators.required);
	issuerDescription = new FormControl(null);
	issuerImage = new FormControl(null);

	schoolForm: FormGroup;
	schoolId = new FormControl(null, Validators.required);
	schoolName = new FormControl(null, Validators.required);
	schoolUrln = new FormControl(null, Validators.required);
	schoolEmail = new FormControl(null, Validators.required);
	schoolImage = new FormControl(null, Validators.required);

	signatureLinesForm: FormGroup;
	signatureLinesName = new FormControl(null, Validators.required);
	signatureLinesImage = new FormControl(null, Validators.required);
	signatureLinesJobTitle = new FormControl(null, Validators.required);


	private asset;
	private errorMessage;

	constructor(private serviceCertificateTemplate: CertificateTemplateService,
							private loadingService: TdLoadingService,
							private authService: AuthService,
							@Inject(FormBuilder) fb: FormBuilder,
							public dialogRef: MatDialogRef<CreateCertificateTemplateDialogComponent>,
							@Inject(MAT_DIALOG_DATA) public data: any) {
		this.schoolForm = fb.group({
			id: this.schoolId,
			name: this.schoolName,
			urln: this.schoolUrln,
			email: this.schoolEmail,
			image: this.schoolImage
		});

		this.signatureLinesForm = fb.group({
			name: this.signatureLinesName,
			image: this.signatureLinesImage,
			jobtitle: this.signatureLinesJobTitle
		});

		this.issuerForm = fb.group({
			id: this.issuerId,
			name: this.issuerName,
			urln: this.issuerUrln,
			email: this.issuerEmail,
			description: this.issuerDescription,
			image: this.issuerImage,
			school: this.schoolForm,
			signatureLines: this.signatureLinesForm
		});

		this.courseForm = fb.group({
			id: this.courseId,
			name: this.courseName,
			description: this.courseDescription,
			image: this.courseImage,
			criteria: this.courseCriteria,
			issuer: this.issuerForm
		});


		this.certificateTemplateForm = fb.group({
			templateId: this.templateId,
			templateImage: this.templateImage,
			globalAdministrator: this.globalAdministrator,
			// typeC: this.typeC,
			course: this.courseForm,
			// context: this.context,
			// revoked: this.revoked
		});
		this.globalAdministrator.disable();
	};

  ngOnInit() { }

	addAsset(): void {
  	console.log(this.courseForm.value);
		if (this.certificateTemplateForm.valid) {
			this.asset = {
				$class: 'org.degree.CertificateTemplate',
				'templateId': this.templateId.value,
				'templateImage': this.templateImage.value,
				'globalAdministrator': this.globalAdministrator.value,
				// 'typeC': this.typeC.value,
				'course': this.courseForm.value
				// 'context': this.context.value,
				// 'revoked': this.revoked.value
			};

			// this.asset = {
			// 	$class: 'org.degree.CertificateTemplate',
			// 	'templateId': this.templateId.value,
			// 	'globalAdministrator': this.globalAdministrator.value,
			// 	// 'typeC': this.typeC.value,
			// 	'badge': {
			// 		'id': this.badgeId.value,
			// 		'name': this.badgeName,
			// 		'description': this.badgeDescription,
			// 		'image': this.badgeImage,
			// 		'criteria': this.badgeCriteria,
			// 		'issuer': {
			// 			'id': this.issuerId,
			// 			'name': this.issuerName,
			// 			'urln': this.issuerUrln,
			// 			'email': this.issuerEmail,
			// 			'description': this.issuerDescription,
			// 			'image': this.issuerImage,
			// 			'school': {
			// 				'id': this.schoolId,
			// 				'name': this.schoolName,
			// 				'urln': this.schoolUrln,
			// 				'email': this.schoolEmail,
			// 				'image': this.schoolImage
			// 			},
			// 			'signatureLines': {
			// 				'name': this.signatureLinesName,
			// 				'image': this.signatureLinesImage,
			// 				'jobtitle': this.signatureLinesJobTitle
			// 			}
			// 		}
			// 	},
			// 	// 'context': this.context.value,
			// 	// 'revoked': this.revoked.value
			// };

			// this.certificateTemplateForm.reset();

			
			this.registerLoading();
			this.serviceCertificateTemplate.addAsset(this.asset)
				.subscribe(
					() => {
						this.errorMessage = null;
						this.certificateTemplateForm.reset();
						this.resolveLoading();
						this.closeDialog({update: true});
					},
					(error) => {
						if (error === 'Server error') {
							this.errorMessage = 'Could not connect to REST server. Please check your configuration details';
						} else {
							this.errorMessage = error;
						}
						this.resolveLoading();
					});
		} else {
			Object.keys(this.certificateTemplateForm.controls).forEach(field => {
				const control = this.certificateTemplateForm.get(field);
				control.markAsTouched({ onlySelf: true });
				// console.log(field, control.errors);
			});
			Object.keys(this.courseForm.controls).forEach(field => {
				const control = this.courseForm.get(field);
				control.markAsTouched({ onlySelf: true });
				// console.log(field, control.errors);
			});
			Object.keys(this.issuerForm.controls).forEach(field => {
				const control = this.issuerForm.get(field);
				control.markAsTouched({ onlySelf: true });
				// console.log(field, control.errors);
			});
			Object.keys(this.schoolForm.controls).forEach(field => {
				const control = this.schoolForm.get(field);
				control.markAsTouched({ onlySelf: true });
				// console.log(field, control.errors);
			});
			Object.keys(this.signatureLinesForm.controls).forEach(field => {
				const control = this.signatureLinesForm.get(field);
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

	/*updateAsset(form: any): void {
		this.asset = {
			$class: 'org.degree.CertificateTemplate',
			'templateImage': this.templateImage.value,
			'globalAdministrator': this.globalAdministrator.value,
			// 'typeC': this.typeC.value,
			'course': this.courseForm.value,
			// 'context': this.context.value,
			// 'revoked': this.revoked.value
		};
   
		this.serviceCertificateTemplate.updateAsset(form.get('templateId').value, this.asset)
			.subscribe(
				() => {
					this.errorMessage = null;
				},
				(error) => {
					if (error === 'Server error') {
						this.errorMessage = 'Could not connect to REST server. Please check your configuration details';
					}	else if (error === '404 - Not Found') {
						this.errorMessage = '404 - Could not find API route. Please check your available APIs.';
					} else {
						this.errorMessage = error;
					}
				});
			}*/
}
