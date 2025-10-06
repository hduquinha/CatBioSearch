const initUserModel = require('../models/Usuario');

(async () => {
    const User = await initUserModel();
    await User.create({
        Nome: 'Administrador',
        Login: 'admin',
        Password: 'admin',
        CPF: '00000000000', // CPF fictício
        Nascimento: '2000-01-01', // Data fictícia
        CRBM: '0000', // CRBM fictício
        Admin: true
    });
    console.log('Usuário administrador criado!');
    process.exit();
})();
