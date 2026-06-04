const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

// Configuración básica de Passport
// Puedes expandir esto más adelante con autenticación real

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    // Aquí normalmente buscarías el usuario en la BD
    done(null, { id: id });
});

// Estrategia Local (básica)
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, (email, password, done) => {
    // Aquí implementarías la lógica de autenticación
    // Por ahora es un placeholder
    return done(null, false);
}));

module.exports = passport;
