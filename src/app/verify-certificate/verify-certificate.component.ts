import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {TdLoadingService} from '@covalent/core';
import {VerifyCertificateService} from './verify-certificate.service';
import {CertificateTemplateService} from '../CertificateTemplate/CertificateTemplate.service';
import {sha256} from '../shared/sha256'
import {PersonalCertificate} from '../org.degree';
import {AuthService} from '../auth/auth.service'
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Router} from '@angular/router';
import {CertificateTemplate} from '../org.degree';
import {MatDialog} from '@angular/material';
import { WarningDialogComponent } from './warning-dialog/warning-dialog.component';

declare var require: any;


var pdfmake = require('pdfmake/build/pdfmake.js');
var fonts = require('pdfmake/build/vfs_fonts.js');




pdfmake.vfs = fonts.pdfMake.vfs


@Component({
	selector: 'app-verify-certificate',
	templateUrl: './verify-certificate.component.html',
	styleUrls: ['./verify-certificate.component.css'],
	providers: [VerifyCertificateService, CertificateTemplateService]
})
export class VerifyCertificateComponent implements OnInit {

	myForm: FormGroup;
	errorMessage: string;
	successMessage: string;
	templateId: string;
	certificateTemplate: any

	private personalCertificateHistory: any[] = [];
	private administratorHistory: any[] = [];

	certId = new FormControl(null, Validators.required);
	email: string;

	currentCertId: string = null;
	personalCertificate: any;
	steps = [
		{
			name: 'Certificate Integrity',
			done: false,
			passed: false,
		},
		{
			name: 'Issuer Identity',
			done: false,
			passed: false,
		}
	];

	constructor(private verifyCertificateService: VerifyCertificateService,
				public createCertificateDialog: MatDialog,
				private loadingService: TdLoadingService,
				private certificateTemplateService: CertificateTemplateService,
				private authService: AuthService,
				private router: Router,
				public fb: FormBuilder) {
					this.myForm = fb.group({
					certId: this.certId
				});
	};

	async ngOnInit() {
		const isAuthenticated = await this.authService.isAuthenticated();
		const hasSignedUp = await this.authService.hasSignedUp();
		console.log(isAuthenticated, hasSignedUp);
		if (isAuthenticated && hasSignedUp){
			await this.authService.setCurrentUser();
		}
		if (isAuthenticated && !hasSignedUp) {
			  this.router.navigate(['/signup']);
		} else {
			  this.router.navigate(['/verify-certificate']);
		}
	}

	openWarningDialog(): void {			
		let dialogRef = this.createCertificateDialog.open(WarningDialogComponent, { 
			data: {Id: this.certId}
		});
		dialogRef.afterClosed().subscribe(result => {
			console.log(`Dialog closed: ${result}`);
			this.ngOnInit();
		});
	}

	/**
	 * Event handler for changing the checked state of a checkbox (handles array enumeration values)
	 * @param {String} name - the name of the transaction field to update
	 * @param {any} value - the enumeration value for which to toggle the checked state
	 */
	changeArrayValue(name: string, value: any): void {
		const index = this[name].value.indexOf(value);
		if (index === -1) {
			this[name].value.push(value);
		} else {
			this[name].value.splice(index, 1);
		}
	}

	/**
	 * Checkbox helper, determining whether an enumeration value should be selected or not (for array enumeration values
	 * only). This is used for checkboxes in the transaction updateDialog.
	 * @param {String} name - the name of the transaction field to check
	 * @param {any} value - the enumeration value to check for
	 * @return {Boolean} whether the specified transaction field contains the provided value
	 */
	hasArrayValue(name: string, value: any): boolean {
		return this[name].value.indexOf(value) !== -1;
	}


	submit(): void {
		this.successMessage = null;
		this.steps[0].passed = false;
		this.steps[0].done = false;
		this.steps[1].passed = false;
		this.steps[1].passed = false;
		if (this.myForm.valid) {
			this.registerLoading();
			this.verifyCertificateService.getAsset(this.certId.value).subscribe(
				(result) => {
					this.currentCertId = this.certId.value;
					this.personalCertificate = result;
					this.templateId = this.personalCertificate['templateId'];
					this.templateId = this.templateId.substring(this.templateId.indexOf("#") + 1, this.templateId.length);
					this.errorMessage = null;
					this.successMessage = null;
					this.verifyHash(result);	
				},
				(error) => {
					if (error === 'Server error') {
						this.errorMessage = 'Could not connect to REST server. Please check your configuration details';
					} else {
						this.errorMessage = ' The Certificate with ID '+this.certId.value+' doesn\'t exist';
					}
					this.resolveLoading();
				}, () => {
					const transaction = {
						$class: 'org.degree.PersonalCertificateHistory',
						'certId': this.certId.value
					};
					this.verifyCertificateService.requestPersonalCertificateHistory(transaction).subscribe(
						(data) => {
							console.log("Request Personal Certificate");
							console.log(data);
							this.verifyCertificateService.getPersonalCertificateHistory(data.transactionId).subscribe(
								async (results) => {
									this.errorMessage = null;
									results = results[0].eventsEmitted[0].results;
									for (let i = 0; i < results.length; i++) {
										let result = results[i].replace(/\\/g, " ");
										result = result.replace(/\"\{/g, "{");
										result = result.replace(/\}\"/g, "}");
										result = JSON.parse(result);
										
										const record = {
											historianRecord: await this.verifyCertificateService.getHistorianRecord(result.tx_id),
											value: result.value
										};
										this.personalCertificateHistory.push(record);
									}
								  console.log(this.personalCertificateHistory);
								},
								(error) => {
									if (error === 'Server error') {
										this.errorMessage = 'Could not connect to REST server. Please check your configuration details';
									} else {
										this.errorMessage = error;
									}
									this.resolveLoading();
								}
							);
						},
						(error) => {
							if (error === 'Server error') {
								this.errorMessage = 'Could not connect to REST server. Please check your configuration details';
							} else {
								this.errorMessage = error;
							}
							this.resolveLoading();
						},
						() => {
							this.email =  this.personalCertificate.localAdministrator;
							this.email = this.email.substring(this.email.indexOf('#') + 1, this.email.length);
							const transaction = {
								$class: 'org.degree.AdministratorHistory',
								'email': this.email
							};
							this.verifyCertificateService.requestAdministratorHistory(transaction).subscribe(
								(data) => {
									console.log("Administrator History");
									console.log(data);
									this.verifyCertificateService.getPersonalCertificateHistory(data.transactionId).subscribe(
										async (results) => {
											this.errorMessage = null;
											console.log("Administrator History Result");
											console.log(results);
											results = results[0].eventsEmitted[0].results;
											for (let i = 0; i < results.length; i++) {
												let result = results[i].replace(/\\/g, " ");
												result = result.replace(/\"\{/g, "{");
												result = result.replace(/\}\"/g, "}");
												result = JSON.parse(result);
												const record = {
													historianRecord: await this.verifyCertificateService.getHistorianRecord(result.tx_id),
													value: result.value
												};
												this.administratorHistory.push(record);
											}
											this.verifyIssuer();
											this.resolveLoading();
										},
										(error) => {
											if (error === 'Server error') {
												this.errorMessage = 'Could not connect to REST server. Please check your configuration details';
											} else {
												this.errorMessage = error;
											}
											this.resolveLoading();
										}
									);
								},
								(error) => {
									if (error === 'Server error') {
										this.errorMessage = 'Could not connect to REST server. Please check your configuration details';
									} else {
										this.errorMessage = error;
									}
									this.resolveLoading();
								});
						});
						
				});
		} else {
			Object.keys(this.myForm.controls).forEach(field => {
				const control = this.myForm.get(field);
				control.markAsTouched({ onlySelf: true });
			});
		}
	}

	verifyIssuer(): Promise<void> {
		// issuer identity
		return new Promise (resolve => setTimeout(resolve => {
			this.steps[1].passed = this.personalCertificateHistory[0].historianRecord.transactionTimestamp >= this.administratorHistory[0].historianRecord.transactionTimestamp;
			this.steps[1].done = true;
		}, 2000));
	}

	verifyHash(certificate: PersonalCertificate): void {
		// certificate integrity
		const hash = certificate.hash;
		delete certificate.hash;
		setTimeout(() => {
			this.steps[0].passed = hash === sha256(JSON.stringify(certificate));
			this.steps[0].done = true;
		}, 2000);
	}

	registerLoading(key = 'loading'): void {
		this.loadingService.register(key);
	}

	resolveLoading(key = 'loading'): void {
		this.loadingService.resolve(key);
	}


	toDataURL(url, callback): void {
		var xhr = new XMLHttpRequest();
		xhr.onload = function() {
		  var reader = new FileReader();
		  reader.onloadend = function() {
			callback(reader.result);
			}
		  reader.readAsDataURL(xhr.response);
		};
		xhr.open('GET', url);
		xhr.responseType = 'blob';
		xhr.send();
	}

	viewPDF(): void{
		console.log('View PDF');
		this.verifyCertificateService.getCertificateTemplate(this.templateId).subscribe(
			(result) => {
				this.certificateTemplate = result;
				let templateImage = this.certificateTemplate['templateImage'];
				console.log(templateImage);
				let certHash = this.personalCertificateHistory[0]['value']['hash '];
				let certificateId = this.personalCertificateHistory[0]['value']['certId '];
				let studentId = this.personalCertificateHistory[0]['value']['recipientProfile ']['studentId '];
				console.log(studentId);
				let name = this.personalCertificateHistory[0]['value']['recipientProfile ']['name '];
				let issuerName = this.certificateTemplate['course']['issuer']['name'];
				let courseName = this.certificateTemplate['course']['name'];
				let program = this.personalCertificate['recipientProfile']['assertions']['program'];
				let remark = this.certificateTemplate['course']['criteria'];
				let month = this.personalCertificate['recipientProfile']['assertions']['lastDate'];
				let year = this.personalCertificate['recipientProfile']['assertions']['lastDate'];
				let description = this.certificateTemplate['course']['description'];
								
				let today = new Date();
				let day = today.getDate();
				let month1 = today.getMonth();
				let year1 = today.getFullYear();

				var monthNames = [
					"January", "February", "March",
					"April", "May", "June", "July",
					"August", "September", "October",
					"November", "December"
				];

				let timestamp = day.toString() + ' th ' + monthNames[month1] + ' th ' + year1.toString();
				month = month.replace(".000Z ","Z");
				let date = new Date(month);
				console.log('Date:'+ date);
				day = date.getDate();
				month1 = date.getMonth();
				year1 = date.getFullYear();
				
				month = monthNames[month1] + ', ' + year1.toString();
				
				/*year = year.replace(".000Z ","Z");
				date = new Date(year);
				day = date.getDate();
				month1 = date.getMonth();
				year1 = date.getFullYear();
				console.log(month1, year1);
				year = 'el ' + day.toString() + ' th ' + monthNames[month] + ' th ' + year.toString();
				*/
				let criteria = this.certificateTemplate['course']['criteria'];

				
				description=description.replace(/\${name}/,name);
				description=description.replace(/\${studentId}/,studentId);
				description=description.replace(/\${issuer}/,issuerName);
				description=description.replace(/\${course}/,courseName);
				description=description.replace(/\${program}/,program);
				description=description.replace(/\${remark}/,remark);
				description=description.replace(/\${month}/,month);
				//description=description.replace(/\${year}/,year);
				description = eval('`'+description+'`');
				criteria = eval('`'+criteria+'`');
				console.log(this.certId);


				this.toDataURL(this.certificateTemplate['course']['issuer']['image'], (dataURL) => {
					//console.log(dataURL);
					this.toDataURL(this.certificateTemplate['course']['issuer']['signatureLines']['image'], (dataURL2) => {
						//console.log(dataURL2);
						this.toDataURL(this.certificateTemplate['templateImage'], (dataURL3) => {
						var docDefinition = {
							pageSize: 'LETTER',
  							background: [
  							 {
       							image: dataURL3,
								width: 610,
								height: 800   
   							}
 							],
							content: [
								
																{
									text: 'Certificate ID: '+certificateId,
									//bold: true,
									font: 'Blackjack',
									fontSize: 16,
									margin: [ 20, 4 ]
								},
								{
									image: dataURL,
									width: 200,
									height: 200,
									alignment: 'center'
								},
								'\n\n',
								{
									text: this.certificateTemplate['course']['issuer']['school']['name'],
									//fontSize: 8,
									style: 'header',
									alignment: 'center'
								},
								'\n\n',
								{
									text: this.certificateTemplate['course']['name'].toUpperCase(),
									bold: true,
									alignment: 'center'
								},
								'\n\n',
								{
									text: description,
									margin: [ 25, 2, 10, 30 ],
									font: 'Lobster',
									alignment: 'justified',
									fontSize: 16,
									//bold:true
      								
								},
								
								{
									text: 'Blockchain Hash: '+certHash,
									bold: true,
									margin: [ 25, 2],
									fontSize: 11,
									alignment:'centered'
								},
								'\n',

								'\n\n\n\n',
								{
									image: dataURL2,
									width: 100,
									height: 40,
									alignment: 'right',
									margin: [ 10, 2 ]
								},
								{
									text: this.certificateTemplate['course']['issuer']['signatureLines']['name'],
									bold: true,
									margin: [ 30, 2 ],
									alignment: 'right'
								},

								{
									text: this.certificateTemplate['course']['issuer']['signatureLines']['jobtitle'],
									bold: true,
									margin: [ 30, 5 ],
									alignment: 'right'
								},
								{ text: 'KTU', margin: [ 30, -50, 10, 10 ], style: 'anotherStyle'},
								{ text: 'Trivandrum - 695016', margin: [ 30, -5, 10, 5 ], style: 'anotherStyle'},
								{ text: 'Date:  '+today.getDate()+'-'+today.getMonth()+'-'+today.getFullYear(), margin: [ 30, 0, 10, 3 ], style: 'anotherStyle'}
								
								

								
							],
							styles: {
								header: {
									fontSize: 18,
									bold: true,
									alignment: 'justify'
								},
								anotherStyle: {
									italics: true,
									alignment: 'left'
								  }
							}
						};
						var win = window.open('', '_blank');
						pdfmake.createPdf(docDefinition).open({}, win);

						});
					});	
				});


											
			},
			(error) => {
				if (error === 'Server error') {
					this.errorMessage = 'Could not connect to REST server. Please check your configuration details';
				} else {
					this.errorMessage = error;
				}
			});
	}

}
