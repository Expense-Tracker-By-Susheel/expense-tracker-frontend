# Expense Tracker UI

### 🔐 1. Authentication & Registration Pages

* 📝 **User Registration Form**:
* Fields needed: Full Name, Email, Password, Phone Number, and Date of Birth (DOB).


* *Example*: Simple sign-up card with clear input fields and a "Register" button.


* 🔑 **Login Screen**:
* Fields needed: Email and Password.


* Option to submit credentials and enter the app.





---

### 📊 2. Dashboard Page

* 📭 **Empty State View**:
* Displays a clean empty view when a new user logs in before uploading any statements.


* *Example*: A friendly prompt saying "Upload your first statement to see analytics!" with an upload button.


* 📈 **Analytics & Graphs View** (Populated after upload):


* **Category Breakdown**: Pie charts and graphs showing spending across different categories for the current month.


* **Monthly Summary Cards**: Cards displaying total monthly income and total monthly expense.


* **Top High-Paid Transactions**: A list or widget highlighting the highest expenses of the current month.


* **Month-over-Month Comparison**: Bar chart comparing current month spending against previous months.





---

### 📤 3. Bank Statement Upload Interface

* 📁 **PDF Drag & Drop Upload Zone**:
* A file upload area to upload bank statement PDFs.




* 🔔 **Status & Alerts**:
* Success pop-up message after a file is uploaded and processed.


* *Example*: Green banner saying "Statement uploaded successfully!"



---

### 💳 4. Transactions Management Page

* 📜 **Transaction List / Table**:
* Displays all extracted transactions clearly.


* *Example*: Columns showing Date, Sender/Receiver Details, Amount, Category, and Tag.


* 🔍 **Search Bar**:
* Search input to quickly find specific transactions by name or keyword.




* 🎯 **Filter Options**:
* Controls to filter transactions by date range, category, or amount.





---

### 🏷️ 5. Category & Tags Management Page (Public Page)

* ⚙️ **Category & Tag Controls**:
* Buttons and forms to add, update, and delete categories and tags.




* ❓ **Unsure Transactions Banner / Section**:
* A dedicated section listing transactions where the system is unsure about the category or tag.


* Displays sender details so any user can suggest and assign the correct category or tag.


* *Example*: Card displaying "Unidentified Transaction: Store XYZ — Select Category: [Dropdown]".


