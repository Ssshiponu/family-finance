function financeApp() {
    return {
        accounts: [],
        selectedAccount: null,
        showAddAccountModal: false,
        showAddTransactionModal: false,
        showDeleteAccountConfirm: false,
        
        // Cloud sync state
        cloudSync: {
            user: null,
            isLoggedIn: false,
            isAnonymous: true,
            isSyncing: false,
            lastSynced: null,
            showAuthModal: false,
            email: '',
            password: '',
            error: null
        },
        transactionType: 'income',
        newAccount: {
            name: '',
        },
        newTransaction: {
            name: '',
            amount: '',
            date: ''
        },
        
        init() {
            this.loadAccounts();
            this.initCloudAuth();
        },
        
        // Initialize Firebase Authentication
        initCloudAuth() {
            // Check if user is already signed in
            auth.onAuthStateChanged((user) => {
                if (user) {
                    this.cloudSync.user = user;
                    this.cloudSync.isLoggedIn = true;
                    this.cloudSync.isAnonymous = user.isAnonymous;
                    this.syncFromCloud();
                }
            });
        },
        
        // Sign in anonymously for guest mode
        signInAnonymously() {
            this.cloudSync.isSyncing = true;
            this.cloudSync.error = null;
            
            auth.signInAnonymously()
                .then((userCredential) => {
                    this.cloudSync.user = userCredential.user;
                    this.cloudSync.isLoggedIn = true;
                    this.cloudSync.isAnonymous = true;
                    this.syncToCloud();
                })
                .catch((error) => {
                    this.cloudSync.error = `Error: ${error.message}`;
                })
                .finally(() => {
                    this.cloudSync.isSyncing = false;
                });
        },
        
        // Sign in with email and password
        signInWithEmail() {
            if (!this.cloudSync.email || !this.cloudSync.password) {
                this.cloudSync.error = 'Please enter email and password';
                return;
            }
            
            this.cloudSync.isSyncing = true;
            this.cloudSync.error = null;
            
            auth.signInWithEmailAndPassword(this.cloudSync.email, this.cloudSync.password)
                .then((userCredential) => {
                    this.cloudSync.user = userCredential.user;
                    this.cloudSync.isLoggedIn = true;
                    this.cloudSync.isAnonymous = false;
                    this.cloudSync.showAuthModal = false;
                    this.syncFromCloud();
                })
                .catch((error) => {
                    if (error.code === 'auth/user-not-found') {
                        // Create new user if not found
                        this.createUserWithEmail();
                    } else {
                        this.cloudSync.error = `Error: ${error.message}`;
                        this.cloudSync.isSyncing = false;
                    }
                });
        },
        
        // Create new user with email and password
        createUserWithEmail() {
            auth.createUserWithEmailAndPassword(this.cloudSync.email, this.cloudSync.password)
                .then((userCredential) => {
                    this.cloudSync.user = userCredential.user;
                    this.cloudSync.isLoggedIn = true;
                    this.cloudSync.isAnonymous = false;
                    this.cloudSync.showAuthModal = false;
                    this.syncToCloud();
                })
                .catch((error) => {
                    this.cloudSync.error = `Error: ${error.message}`;
                })
                .finally(() => {
                    this.cloudSync.isSyncing = false;
                });
        },
        
        // Sign out
        signOut() {
            auth.signOut()
                .then(() => {
                    this.cloudSync.user = null;
                    this.cloudSync.isLoggedIn = false;
                    this.cloudSync.isAnonymous = true;
                    this.cloudSync.lastSynced = null;
                })
                .catch((error) => {
                    console.error('Sign out error:', error);
                });
        },
        
        loadAccounts() {
            const savedAccounts = localStorage.getItem('financeAccounts');
            if (savedAccounts) {
                this.accounts = JSON.parse(savedAccounts);
            }
        },
        
        saveAccounts() {
            // Save to localStorage
            localStorage.setItem('financeAccounts', JSON.stringify(this.accounts));
            
            // If logged in, save to cloud
            if (this.cloudSync.isLoggedIn) {
                this.syncToCloud();
            }
        },
        
        // Sync data to Firebase Cloud
        syncToCloud() {
            if (!this.cloudSync.user) return;
            
            this.cloudSync.isSyncing = true;
            
            db.collection('users').doc(this.cloudSync.user.uid).set({
                accounts: this.accounts,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                this.cloudSync.lastSynced = new Date();
                console.log('Data successfully synced to cloud!');
            })
            .catch((error) => {
                console.error('Error syncing to cloud:', error);
            })
            .finally(() => {
                this.cloudSync.isSyncing = false;
            });
        },
        
        // Sync data from Firebase Cloud
        syncFromCloud() {
            if (!this.cloudSync.user) return;
            
            this.cloudSync.isSyncing = true;
            
            db.collection('users').doc(this.cloudSync.user.uid).get()
            .then((doc) => {
                if (doc.exists && doc.data().accounts) {
                    // Merge cloud data with local data
                    this.accounts = doc.data().accounts;
                    localStorage.setItem('financeAccounts', JSON.stringify(this.accounts));
                    this.cloudSync.lastSynced = new Date();
                    console.log('Data successfully retrieved from cloud!');
                } else {
                    // No data in cloud yet, upload local data
                    this.syncToCloud();
                }
            })
            .catch((error) => {
                console.error('Error getting data from cloud:', error);
            })
            .finally(() => {
                this.cloudSync.isSyncing = false;
            });
        },
        
        addAccount() {
            this.accounts.push({
                name: this.newAccount.name,
                createdAt: new Date().toISOString(),
                transactions: {
                    income: [],
                    expenses: []
                }
            });
            
            this.saveAccounts();
            this.newAccount.name = '';
            this.showAddAccountModal = false;
        },
        
        selectAccount(index) {
            this.selectedAccount = index;
        },
        
        getCurrentAccount() {
            if (this.selectedAccount !== null && this.accounts[this.selectedAccount]) {
                return this.accounts[this.selectedAccount];
            }
            return { name: '', transactions: { income: [], expenses: [] } };
        },
        
        openAddTransactionModal(type) {
            this.transactionType = type;
            this.newTransaction = {
                name: '',
                amount: '',
                date: ''
            };
            this.showAddTransactionModal = true;
        },
        
        addTransaction() {
            const transaction = {
                name: this.newTransaction.name,
                amount: parseFloat(this.newTransaction.amount),
                date: this.newTransaction.date ? new Date(this.newTransaction.date).toISOString() : null
            };
            
            this.accounts[this.selectedAccount].transactions[this.transactionType].push(transaction);
            this.saveAccounts();
            this.showAddTransactionModal = false;
        },
        
        // Track which transaction is being considered for deletion
        deleteTransactionConfirm: {
            show: false,
            type: null,
            index: null
        },
        
        // Show confirmation dialog for transaction deletion
        confirmDeleteTransaction(type, index) {
            this.deleteTransactionConfirm = {
                show: true,
                type: type,
                index: index
            };
        },
        
        // Cancel transaction deletion
        cancelDeleteTransaction() {
            this.deleteTransactionConfirm = {
                show: false,
                type: null,
                index: null
            };
        },
        
        // Confirm and execute transaction deletion
        removeTransaction() {
            const { type, index } = this.deleteTransactionConfirm;
            if (type !== null && index !== null) {
                this.accounts[this.selectedAccount].transactions[type].splice(index, 1);
                this.saveAccounts();
            }
            this.cancelDeleteTransaction();
        },
        
        deleteAccount() {
            this.accounts.splice(this.selectedAccount, 1);
            this.saveAccounts();
            this.selectedAccount = null;
            this.showDeleteAccountConfirm = false;
        },
        
        calculateTotal(transactions) {
            return transactions.reduce((total, transaction) => total + transaction.amount, 0);
        },
        
        formatCurrency(amount) {
            return amount + ' ৳'
        },
        
        formatDate(dateString) {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        },
        
        exportPDF() {
            // First, load jspdf and html2canvas directly from CDN
            this.loadScripts([
                'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
                'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
            ], () => this.generatePDFContent());
        },
        
        loadScripts(urls, callback) {
            let loadedCount = 0;
            
            urls.forEach(url => {
                const script = document.createElement('script');
                script.src = url;
                script.onload = () => {
                    loadedCount++;
                    if (loadedCount === urls.length) {
                        callback();
                    }
                };
                document.head.appendChild(script);
            });
        },
        
        generatePDFContent() {
            const account = this.getCurrentAccount();
            if (!account) return;
            
            // Create a visible element with proper styling
            const element = document.createElement('div');
            element.id = 'pdf-export-container';
            element.style.position = 'fixed';
            element.style.top = '0';
            element.style.left = '0';
            element.style.width = '210mm';  // A4 width
            element.style.padding = '10mm';
            element.style.backgroundColor = 'white';
            element.style.zIndex = '-9999';
            element.style.fontFamily = 'Arial, sans-serif';
            
            const incomeTotal = this.calculateTotal(account.transactions.income);
            const expenseTotal = this.calculateTotal(account.transactions.expenses);
            const balance = incomeTotal - expenseTotal;
            
            element.innerHTML = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="font-size: 24px; margin-bottom: 5px;">${account.name}</h1>
                    <p style="font-size: 14px; color: #666;">Report Created: ${new Date().toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})}</p>
                </div>
                
                <div style="margin-bottom: 30px;">
                    <h2 style="font-size: 18px; padding-bottom: 5px; border-bottom: 1px solid #ddd;">Incomes</h2>
                    ${this.generatePDFTable(account.transactions.income)}
                </div>
                
                <div style="margin-bottom: 30px;">
                    <h2 style="font-size: 18px; padding-bottom: 5px; border-bottom: 1px solid #ddd;">Expences</h2>
                    ${this.generatePDFTable(account.transactions.expenses)}
                </div>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 30px;">
                    <h3 style="margin-top: 0; margin-bottom: 10px;">Summary</h3>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>Tottal Income:</span>
                        <span style="font-weight: bold;">${this.formatCurrency(incomeTotal)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>Tottal Expence:</span>
                        <span style="font-weight: bold;">${this.formatCurrency(expenseTotal)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>Balance:</span>
                        <span style="font-weight: bold;">${this.formatCurrency(balance)}</span>
                    </div>
                </div>
            `;
            
            document.body.appendChild(element);
            
            // Give the browser a moment to render the content
            setTimeout(() => {
                this.captureAndGeneratePDF(element, account.name);
            }, 500);
        },
        
        generatePDFTable(transactions) {
            if (!transactions || transactions.length === 0) {
                return '<p style="text-align: center; color: #666;">No Tranjection</p>';
            }
            
            const total = this.calculateTotal(transactions);
            
            let tableHTML = `
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #ddd;">
                    <thead>
                        <tr>
                            <th style="padding: 8px; text-align: left; border: 1px solid #ddd; background-color: #f5f5f5;">Name</th>
                            <th style="padding: 8px; text-align: left; border: 1px solid #ddd; background-color: #f5f5f5;">Date</th>
                            <th style="padding: 8px; text-align: right; border: 1px solid #ddd; background-color: #f5f5f5;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            transactions.forEach(transaction => {
                tableHTML += `
                    <tr>
                        <td style="padding: 8px; text-align: left; border: 1px solid #ddd;">${transaction.name}</td>
                        <td style="padding: 8px; text-align: left; border: 1px solid #ddd;">${transaction.date ? this.formatDate(transaction.date) : '-'}</td>
                        <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">${this.formatCurrency(transaction.amount)}</td>
                    </tr>
                `;
            });
            
            tableHTML += `
                    <tr style="font-weight: bold;">
                        <td colspan="2" style="padding: 8px; text-align: left; border: 1px solid #ddd; background-color: #f5f5f5;">মোট</td>
                        <td style="padding: 8px; text-align: right; border: 1px solid #ddd; background-color: #f5f5f5;">${this.formatCurrency(total)}</td>
                    </tr>
                </tbody>
            </table>
            `;
            
            return tableHTML;
        },
        
        captureAndGeneratePDF(element, filename) {
            // Use html2canvas to capture the element
            html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            }).then(canvas => {
                // Create PDF document
                const pdf = new jspdf.jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4'
                });
                
                // Canvas dimensions
                const imgWidth = 190; // A4 width in mm minus margins
                const imgHeight = canvas.height * imgWidth / canvas.width;
                
                // Add the image to the PDF
                const imgData = canvas.toDataURL('image/jpeg', 1.0);
                pdf.addImage(imgData, 'JPEG', 10, 10, imgWidth, imgHeight);
                
                // Save the PDF
                pdf.save(`${filename}_report.pdf`);
                
                // Clean up
                document.body.removeChild(element);
            });
        },
        
        generateTransactionTable(transactions) {
            if (!transactions || transactions.length === 0) {
                return '<p>No transaction</p>';
            }
            
            let tableHTML = `
                <table class="transaction-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Date</th>
                            <th class="amount">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            transactions.forEach(transaction => {
                tableHTML += `
                    <tr>
                        <td>${transaction.name}</td>
                        <td>${transaction.date ? this.formatDate(transaction.date) : '-'}</td>
                        <td class="amount">${this.formatCurrency(transaction.amount)}</td>
                    </tr>
                `;
            });
            
            const total = this.calculateTotal(transactions);
            tableHTML += `
                    <tr class="total-row">
                        <td colspan="2">Tottal</td>
                        <td class="amount">${this.formatCurrency(total)}</td>
                    </tr>
                </tbody>
            </table>
            `;
            
            return tableHTML;
        },
        
        generatePDF(element, filename) {
            const options = {
                margin: 10,
                filename: `${filename}_report.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            
            // Generate and download PDF
            html2pdf().from(element).set(options).save().then(() => {
                // Remove the element after PDF generation
                document.body.removeChild(element);
            });
        }
    };
}