const request = require('supertest');
const app = require('../app');
var config = require('../src/auth/config');
var jwt = require('jsonwebtoken');
const ItemModel = require('../src/database/models/item.model');
const OrderModel = require('../src/database/models/order.model');
const UserModel = require('../src/database/models/user.model');

var gToken = undefined;
var gUser = undefined;
var gUserID = undefined;
var gItemID = undefined;
var gOrderID = undefined;
var lOrderID = undefined;

function generateDescription() {
    var text = "";
    var possible = "ABC DEFGH IJKL MNOPQRST U VWXYZabcde fghijklmnopq rstu vwxy z";
    for (var i = 0; i < 80; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}

function generateUserName() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < 8; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}

function generateItemCode() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < 2; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    text += '-';
    for (var i = 0; i < 3; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    text += '-';
    for (var i = 0; i < 3; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text.toUpperCase();
}

beforeAll(async (done) => {
    // Create a new user and get correct credentials to access orders
    gUser = generateUserName();
    let orderingUser = new UserModel({
        username: gUser,
        password: 'falsepassword',
        isAdmin: false
    });
    let testingItem = new ItemModel({
        "productID": "TH-ISI-STS",
        "productTitle": "Test Item",
        "quantity": 999,
        "description": "This is a test item generated for testing",
        "price": 1000.00
    });
    await orderingUser.save().then(doc => {
        gUserID = doc._id;
        gToken = jwt.sign({ id: doc._id }, config.secret, {
            expiresIn: (24 * 60 * 60)
        });
        ItemModel.findOneAndDelete(
            { productID: "TH-ISI-STS" }).then(res => {
                testingItem.save().then(itm => {
                    gItemID = itm._id;
                    console.debug('Done creating a test user for orders. Proceed with testing');
                    done();
                });
            }).catch(err => {
                testingItem.save().then(itm => {
                    gItemID = itm._id;
                    console.error('Done creating a test user for orders. Proceed with testing');
                    done();
                });
            });
    });
});

describe('Adding new items to database', function () {

    it('Adds an item with proper authorization', function (done) {
        request(app)
            .post('/api/item/new')
            .set('x-access-token', gToken)
            .send({
                "productID": generateItemCode(),
                "productTitle": generateUserName(),
                "quantity": parseInt(Math.random() * 50),
                "description": generateDescription(),
                "price": parseInt(Math.random() * 1000) / 100
            })
            .expect(200, done);
    });
    it('Adds an item with invalid token', function (done) {
        request(app)
            .post('/api/item/new')
            .set('x-access-token', gToken + 'z')
            .send({
                "productID": generateItemCode(),
                "productTitle": generateUserName(),
                "quantity": parseInt(Math.random() * 50),
                "description": "Random item description is here",
                "price": parseInt(Math.random() * 1000) / 100
            })
            .expect(500, done);
    });
    it('Adds an item without authorization', function (done) {
        request(app)
            .post('/api/item/new')
            .send({
                "productID": generateItemCode(),
                "productTitle": generateUserName(),
                "quantity": parseInt(Math.random() * 50),
                "description": "Random item description without token is here",
                "price": parseInt(Math.random() * 1000) / 100
            })
            .expect(403, done);
    });
    it('Adds an item with bogus data proper authorization', function (done) {
        request(app)
            .post('/api/item/new')
            .set('x-access-token', gToken)
            .send({
                "productID": generateItemCode(),
                "productTitle": generateUserName(),
                "quantity": 'Invalid',
                "description": generateDescription(),
                "price": parseInt(Math.random() * 1000) / 100
            })
            .expect(400, done);
    });
});

describe('Fetching an item', function () {

    it('Fetch an item from ID', function (done) {
        request(app)
            .get(`/api/item/item/${gItemID}`)
            .set('x-access-token', gToken)
            .expect(200).then(d => {
                expect(d.body.productID).toBe('TH-ISI-STS');
                done();
            });
    });
    it('Fetch an item which is not in database', function (done) {
        request(app)
            .get(`/api/item/item/${gItemID}z`)
            .set('x-access-token', gToken)
            .expect(404, done);
    });
    it('Fetch an item from ID without authorization', function (done) {
        request(app)
            .get(`/api/item/item/${gItemID}`)
            .expect(403, done);
    });
    it('Fetch an item from ID with invalid token', function (done) {
        request(app)
            .get(`/api/item/item/${gItemID}`)
            .set('x-access-token', gToken + 'z')
            .expect(500, done);
    });
});

describe('Updating an item', function () {

    it('Update an item from ID', function (done) {
        request(app)
            .put(`/api/item/item/${gItemID}`)
            .set('x-access-token', gToken)
            .send({
                quantity: 500
            })
            .expect(200).then(d => {
                expect(d.body.quantity).toBe(500);
                expect(d.body.price).toBe(1000);
                done();
            });
    });
    it('Update an item which is not in database', function (done) {
        request(app)
            .put(`/api/item/item/${gItemID}z`)
            .set('x-access-token', gToken)
            .expect(404, done);
    });
    it('Update an item from ID without authorization', function (done) {
        request(app)
            .put(`/api/item/item/${gItemID}`)
            .expect(403, done);
    });
    it('Update an item from ID with invalid token', function (done) {
        request(app)
            .put(`/api/item/item/${gItemID}`)
            .set('x-access-token', gToken + 'z')
            .expect(500, done);
    });
});

describe('Fetching the item list', function () {

    it('Fetch item list with valid credentials', function (done) {
        request(app)
            .get('/api/item/list')
            .set('x-access-token', gToken)
            .expect(200).then(d => {
                gItemList = d;
                expect(d.body.length).toBeGreaterThan(1);
                done();
            });
    });
    it('Fetch item list without authorization', function (done) {
        request(app)
            .get('/api/item/list')
            .expect(403, done);
    });
    it('Fetch item list with an invalid token', function (done) {
        request(app)
            .get('/api/item/list')
            .set('x-access-token', gToken + 'z')
            .expect(500, done);
    });
});

describe('Creates an order', function () {

    it('Creates a blank order with proper authorization', function (done) {
        request(app)
            .post('/api/order/new')
            .set('x-access-token', gToken)
            .expect(200).then(r => {
                gOrderID = r.body._id;
                done();
            });
    });
    it('Creates an order without authorization', function (done) {
        request(app)
            .post('/api/order/new')
            .expect(403, done);
    });
    it('Creates an order with invalid token', function (done) {
        request(app)
            .post('/api/order/new')
            .set('x-access-token', gToken + 'z')
            .expect(500, done);
    });
});

describe('Fetches an order', function () {

    it('Fetches an order with proper authorization', function (done) {
        request(app)
            .get(`/api/order/order/${gOrderID}`)
            .set('x-access-token', gToken)
            .expect(200).then(r => {
                expect(JSON.stringify(r.body.cartID)).toBe(JSON.stringify(gUserID));
                done();
            });
    });
    it('Fetches an order which is not in database', function (done) {
        request(app)
            .get(`/api/order/order/${gOrderID}z`)
            .set('x-access-token', gToken)
            .expect(404, done);
    });
    it('Fetches an order without authorization', function (done) {
        request(app)
            .get(`/api/order/order/${gOrderID}`)
            .expect(403, done);
    });
    it('Fetches an order with invalid token', function (done) {
        request(app)
            .get(`/api/order/order/${gOrderID}`)
            .set('x-access-token', gToken + 'z')
            .expect(500, done);
    });

    afterAll(async (done) => {
        OrderModel.deleteMany({ cartID: gUserID }).then(res => {
            done();
        });
    });
});

describe('Updates an order', function () {

    beforeAll(async (done) => {
        let testItem1 = new ItemModel({
            productID: 'AA-FIR-ST1',
            productTitle: "Test Item One",
            quantity: 100,
            description: "This is the first test item created",
            price: 150.00
        });
        let testItem2 = new ItemModel({
            productID: 'BB-SEC-OND',
            productTitle: "Test Item Two",
            quantity: 45,
            description: "This is the second test item created",
            price: 899.50
        });
        let testOrder = new OrderModel({
            cartID: gUserID
        });
        var itemz = [testItem1, testItem2];
        await ItemModel.insertMany(itemz).then(docs => {
            testOrder.save().then(doc => {
                lOrderID = doc._id;
                console.log('Created two test items and a order');
                done();
            });
        });
    });

    it('Adds an item to an order with proper authorization', function (done) {
        request(app)
            .put(`/api/order/order/${lOrderID}`)
            .set('x-access-token', gToken)
            .send({
                productID: 'AA-FIR-ST1',
                quantity: 20
            })
            .expect(200).then(r => {
                expect(r.body.items[0].quantity).toBe(20);
                done();
            });
    });
    it('Adds another item to the same order with proper authorization', function (done) {
        request(app)
            .put(`/api/order/order/${lOrderID}`)
            .set('x-access-token', gToken)
            .send({
                productID: 'BB-SEC-OND',
                quantity: 5
            })
            .expect(200).then(r => {
                expect(r.body.items[0].quantity).toBe(5);
                done();
            });
    });
    it('Adds firstly added item again to the same order with proper authorization', function (done) {
        request(app)
            .put(`/api/order/order/${lOrderID}`)
            .set('x-access-token', gToken)
            .send({
                productID: 'AA-FIR-ST1',
                quantity: 1
            })
            .expect(200).then(r => {
                expect(r.body.items[1].quantity).toBe(21);
                done();
            });
    });
    it('Adds item to a non existing order with proper authorization', function (done) {
        request(app)
            .put(`/api/order/order/${lOrderID}z`)
            .set('x-access-token', gToken)
            .send({
                productID: 'FH-Q9J-5FO',
                quantity: -1
            })
            .expect(404, done);
    });
    it('Adds a non existing item to an order with proper authorization', function (done) {
        request(app)
            .put(`/api/order/order/${lOrderID}`)
            .set('x-access-token', gToken)
            .send({
                productID: 'DO-ESN-OTE',
                quantity: 10
            })
            .expect(404, done);
    });

    afterAll(async (done) => {
        await ItemModel.findOneAndDelete({ productID: 'AA-FIR-ST1' }).then(res => {
            ItemModel.findOneAndDelete({ productID: 'BB-SEC-OND' }).then(res => {
                console.log('Deleted test items in orders');
                done();
            });
        });
    });
});

describe('User fetches a list of orders', function () {

    beforeAll(async (done) => {
        let testItem1 = new ItemModel({
            productID: 'CC-FIR-ST1',
            productTitle: "Test Item Three",
            quantity: 50,
            description: "This is the third test item created",
            price: 89.00
        });
        let testItem2 = new ItemModel({
            productID: 'DD-SEC-OND',
            productTitle: "Test Item Four",
            quantity: 34,
            description: "This is the fourth test item created",
            price: 175.50
        });
        var itemz = [testItem1, testItem2];
        let testOrder = new OrderModel({
            cartID: gUserID,
            items: itemz
        });
        await ItemModel.insertMany(itemz).then(docs => {
            testOrder.save().then(doc => {
                lOrderID = doc._id;
                done();
            });
        });
    });

    it('Fetches a set of orders related to user with valid authorization', function (done) {
        request(app)
            .get('/api/order/list')
            .set('x-access-token', gToken)
            .expect(200).then(res => {
                expect(res.body.length).toBe(2);
                expect(res.body[1].items[1].productID).toBe('DD-SEC-OND');
                expect(res.body[0].items[0].productID).toBe('BB-SEC-OND');
                done();
            });
    });
    it('Fetches a set of orders with invalid authorization', function (done) {
        request(app)
            .get('/api/order/list')
            .set('x-access-token', gToken + 'z')
            .expect(500, done);
    });
    it('Fetches a set of orders with no authorization', function (done) {
        request(app)
            .get('/api/order/list')
            .expect(403, done);
    });

    afterAll(async (done) => {
        await ItemModel.findOneAndDelete({ productID: 'CC-FIR-ST1' }).then(res => {
            ItemModel.findOneAndDelete({ productID: 'DD-SEC-OND' }).then(res => {
                console.log('Deleted test items in orderlist');
                done();
            });
        });
    });
});

describe('Adds item to an order', function () {

    beforeAll(async (done) => {
        let testItem = new ItemModel({
            productID: 'NE-WPOS-TME',
            productTitle: "New Adding Method",
            quantity: 500,
            description: "This is a test item created to test adding a new item",
            price: 250.00
        });
        // Save the test item
        await testItem.save().then(doc => {
            done();
        });
    });

    it('Adds a new item to the order without authorization', function (done) {
        request(app)
            .post(`/api/order/add/${lOrderID}`)
            .send({
                productID: 'NE-WPOS-TME',
                quantity: 10
            })
            .expect(403, done);
    });
    it('Adds a new item to the order with invalid authorization', function (done) {
        request(app)
            .post(`/api/order/add/${lOrderID}`)
            .set('x-access-token', gToken + 'z')
            .send({
                productID: 'NE-WPOS-TME',
                quantity: 10
            })
            .expect(500, done);
    });
    it('Adds a new item to the order', function (done) {
        request(app)
            .post(`/api/order/add/${lOrderID}`)
            .set('x-access-token', gToken)
            .send({
                productID: 'NE-WPOS-TME',
                quantity: 10
            })
            .expect(200).then(res => {
                ItemModel.findOne({ productID: 'NE-WPOS-TME' }).then(doc => {
                    expect(doc.quantity).toBe(490);
                    done();
                });
            });
    });
    it('Adds a non existing item to the order', function (done) {
        request(app)
            .post(`/api/order/add/${lOrderID}`)
            .set('x-access-token', gToken)
            .send({
                productID: 'NE-WNOS-TME',
                quantity: 10
            })
            .expect(404, done);
    });

    afterAll(async (done) => {
        await ItemModel.findOneAndDelete({ productID: 'NE-WPOS-TME' }).then(res => {
            done();
        })
    });
});

describe('Checkouts an order', function () {

    it('Checkout the order with no authorization', function (done) {
        request(app)
            .delete(`/api/order/checkout/${lOrderID}`)
            .expect(403, done);
    });
    it('Checkout the order with invalid authorization', function (done) {
        request(app)
            .delete(`/api/order/checkout/${lOrderID}`)
            .set('x-access-token', gToken + 'z')
            .expect(500, done);
    });
    it('Checkout the order with valid authorization', function (done) {
        request(app)
            .delete(`/api/order/checkout/${lOrderID}`)
            .set('x-access-token', gToken)
            .expect(200, done);
    });
    it('Checkout a non existing order with valid authorization', function (done) {
        request(app)
            .delete(`/api/order/checkout/${lOrderID}z`)
            .set('x-access-token', gToken)
            .expect(404, done);
    });
});

describe('Deleting an order', function () {
    let cartID = undefined;

    beforeAll(async (done) => {
        let testItem1 = new ItemModel({
            productID: 'TH-ENE-W01',
            productTitle: "Item Under Test 01",
            quantity: 490,
            description: "This item has 490 at the beginning",
            price: 250.00
        });
        let testItem1C = new ItemModel({
            productID: 'TH-ENE-W01',
            productTitle: "Item Under Test 01",
            quantity: 10,
            description: "This item was added to order",
            price: 250.00
        });

        let testItem2 = new ItemModel({
            productID: 'TH-ENE-W02',
            productTitle: "Item Under Test 02",
            quantity: 1567,
            description: "This item has 1567 at the beginning",
            price: 487.33
        });
        let testItem2C = new ItemModel({
            productID: 'TH-ENE-W02',
            productTitle: "Item Under Test 02",
            quantity: 433,
            description: "This item was added to order",
            price: 487.33
        });

        let testOrder = new OrderModel({
            cartID: 'ThisIsTheTestCartID',
            items: [testItem1C, testItem2C]
        });
        await ItemModel.insertMany([testItem1, testItem2]).then(docs => {
            testOrder.save().then(doc => {
                cartID = doc._id;
                done();
            });
        });
    });

    it('Delete the order with no authorization', function (done) {
        request(app)
            .delete(`/api/order/order/${lOrderID}`)
            .expect(403, done);
    });
    it('Delete the order with invalid authorization', function (done) {
        request(app)
            .delete(`/api/order/order/${lOrderID}`)
            .set('x-access-token', gToken + 'z')
            .expect(500, done);
    });
    it('Delete the order with valid authorization', function (done) {
        request(app)
            .delete(`/api/order/order/${cartID}`)
            .set('x-access-token', gToken)
            .expect(200).then(res => {
                ItemModel.findOne({ productID: 'TH-ENE-W01' }).then(doc1 => {
                    ItemModel.findOne({ productID: 'TH-ENE-W02' }).then(doc2 => {
                        expect(doc1.quantity).toBe(500);
                        expect(doc2.description).toBe('This item has 1567 at the beginning');
                        expect(doc2.quantity).toBe(2000);
                        done();
                    });
                });
            });
    });
    it('Delete a non existing order with valid authorization', function (done) {
        request(app)
            .delete(`/api/order/checkout/${lOrderID}z`)
            .set('x-access-token', gToken)
            .expect(404, done);
    });

    afterAll(async (done) => {
        await OrderModel.findOneAndDelete({ cartID: 'ThisIsTheTestCartID' }).then(res => {
            ItemModel.deleteOne({ productID: 'TH-ENE-W01' }).then(doc => {
                ItemModel.deleteOne({ productID: 'TH-ENE-W02' }).then(doc => {
                    console.log('Deleted test items created for deleting an order');
                    done();
                });
            });
        })
    });
});

afterAll(async (done) => {
    await UserModel.findByIdAndDelete(gUserID).then(res => {
        console.log('Deleted test user created');
        done();
    });
});