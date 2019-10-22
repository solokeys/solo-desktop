var routes = require('./../main/routes');

async function runTests(){
    await routes.init();

    await routes.register();
}

if (require.main === module) {

    runTests();

}