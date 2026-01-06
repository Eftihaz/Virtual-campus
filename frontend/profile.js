<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Profile - Virtual Campus</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header>
      <div class="header-top">
        <h1>Virtual Campus</h1>
        <div class="header-actions">
          <button id="themeToggle" class="theme-toggle" title="Toggle dark mode">🌙</button>
          <a href="/" class="btn btn-secondary">Back to Home</a>
        </div>
      </div>
    </header>
    <main>
      <div class="profile-container">
        <div class="profile-card">
          <h2>My Profile</h2>
          <form id="profileForm">
            <div class="form-group">
              <label for="name">Full Name</label>
              <input type="text" id="name" required />
            </div>
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" disabled />
            </div>
            <div class="form-group">
              <label for="role">Role</label>
              <input type="text" id="role" disabled />
            </div>
            <div class="form-group">
              <label for="department">Department</label>
              <input type="text" id="department" />
            </div>
            <div class="form-group">
              <label for="studentId">Student ID</label>
              <input type="text" id="studentId" />
            </div>
            <button type="submit" class="btn btn-primary">Update Profile</button>
          </form>
          <div id="profileError" class="error-message"></div>
          <div id="profileSuccess" class="success-message"></div>
        </div>
      </div>
    </main>
    <script src="auth.js"></script>
    <script src="theme.js"></script>
    <script>
      async function loadProfile() {
        try {
          const user = await getProfile();
          document.getElementById('name').value = user.name || '';
          document.getElementById('email').value = user.email || '';
          document.getElementById('role').value = user.role || '';
          document.getElementById('department').value = user.department || '';
          document.getElementById('studentId').value = user.studentId || '';
        } catch (error) {
          window.location.href = '/signin.html';
        }
      }

      document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorDiv = document.getElementById('profileError');
        const successDiv = document.getElementById('profileSuccess');
        errorDiv.textContent = '';
        successDiv.textContent = '';
        
        try {
          const name = document.getElementById('name').value;
          const department = document.getElementById('department').value;
          const studentId = document.getElementById('studentId').value;
          await updateProfile(name, department, studentId);
          successDiv.textContent = 'Profile updated successfully!';
        } catch (error) {
          errorDiv.textContent = error.message;
        }
      });

      loadProfile();
    </script>
  </body>
</html>

