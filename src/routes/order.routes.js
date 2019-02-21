var express = require('express');
var router = express.Router();
var VerifyToken = require('../auth/verifytoken');
var ItemModel = require('../database/models/item.model');
var OrderModel = require('../database/models/order.model');
var CartModel = require('../database/models/cart.model');

/*
- Cart
   |-- Order
        |-- Item
        |-- Item
        |-- Item
   |-- Order
        |-- Item
*/

function isThatInIt(That, It) {
    var index = -1;
    for (var i = 0; i < It.length; i++) {
        if (It[i].productID === That) {
            index = i;
        }
    }
    return index;
}

// Creates a new order list ###################################################
router.post('/cart/new', VerifyToken, (req, res, next) => {
    // Fetch the new cart details
    let cart = {};
    // Attach current user ID to it
    cart.userID = req._id;
    // Save the cart in DB
    let o = new CartModel(cart);
    o.save().then(doc => {
        res.status(201).json({
            status: 'Cart created succefully',
            id: doc._id
        });
    }).catch(er => {
        // A cart already exists for the specified user
        if (er.code === 11000) {
            // Find the cart ID and send it to user
            CartModel.findOne({ userID: req._id }).then(doc => {
                res.status(200).json({
                    status: 'A cart already exists',
                    id: doc._id
                });
            });
        } else {
            console.error(er.code);
            res.status(400).send(er);
        }
    });
});

// Gets an order list #########################################################
router.get('/cart/:id', VerifyToken, (req, res, next) => {
    CartModel
        .findOne({ _id: req.params.id })
        .then(doc => {
            res.status(200).json(doc);
        })
        .catch(er => {
            res.status(404).json({ 'error': 'Cannot find such order list' });
        });
});

// Deletes an order list ######################################################
router.delete('/cart/:id', VerifyToken, (req, res, next) => {
    CartModel.findOneAndDelete(
        { _id: req.params.id }).then(doc => {
            return res.status(200).json(doc);
        }).catch(er => {
            return res.status(404).json({ 'status': 'Order list not found' });
        });
});

// Updates an order list ??????????????????????????????????????????????????????
router.put('/cart/:id', (req, res) => {
    CartModel.findOneAndUpdate(
        { _id: req.params.id }, req.body, { new: true }).then(doc => {
            return res.status(200).json(doc);
        }).catch(er => {
            return res.status(404).json({ 'status': 'Order list not found' });
        });
});

// Creates a new order ########################################################
router.post('/order/new', VerifyToken, (req, res, next) => {
    let o = new OrderModel(req.body);
    o.save().then(doc => {
        res.status(200).json({ id: doc._id });
    }).catch(er => {
        res.status(400).send(er);
    });
});

// Gets an order #############################################################
router.get('/order/:id', VerifyToken, (req, res, next) => {
    OrderModel
        .findOne({ _id: req.params.id })
        .then(doc => {
            res.status(200).json(doc);
        })
        .catch(er => {
            res.status(404).json({ 'error': 'Cannot find such order list' });
        });
});

// Updates an order ###########################################################
router.put('/order/:id', VerifyToken, (req, res, next) => {
    // First find the specific order and save the item list
    OrderModel.findOne({ _id: req.params.id }).then(order => {
        var itemList = order.items;
        var index = isThatInIt(req.body.productID, itemList);
        // Fetch the item from item pool
        ItemModel.findOne({ productID: req.body.productID }).then(item => {
            // We need to update the global item quantity; so calculate the new quantity
            let newQuantity = item.quantity - req.body.quantity;
            if (index >= 0) { // If the item is already there, update its count without adding a new item to the list
                itemList[index].quantity += req.body.quantity;
            } else {
                // Clone the item so that we can add it to our order as a seperate item
                let newItem = item;
                // Set it's quantity as the purchased quantity
                newItem.quantity = req.body.quantity;
                // Add the new item to the item list in our order
                itemList.unshift(newItem);
            }
            // Update our order with the new item list
            OrderModel.findOneAndUpdate({ _id: req.params.id }, { $set: { items: itemList } }, { new: true })
                .then(newOrder => {
                    // Now that we have updated our order, update the global item properties
                    ItemModel.findOneAndUpdate({ productID: req.body.productID }, { $set: { quantity: newQuantity } }, { new: true })
                        .then(updatedItem => {
                            return res.status(200).json(newOrder);
                        }).catch(err => {
                            return res.status(500).json({ 'status': 'Error updating item' });
                        });
                }).catch(err => {
                    return res.status(500).json({ 'status': 'Error adding item to list' });
                });
        }).catch(err => {
            // Don't worry this won't happen as I will handle this validation from front end
            return res.status(404).json({ 'status': 'Item not found' });
        });
    }).catch(err => {
        return res.status(404).json({ 'status': 'Order list not found' });
    });
});

// Deletes an order
router.delete('/order/:id', (req, res) => {
    OrderModel.findOneAndDelete(
        { _id: req.params.id }).then(doc => {
            return res.status(200).json(doc);
        }).catch(er => {
            return res.status(404).json({ 'status': 'Order list not found' });
        });
});

// Creates a new item #########################################################
router.post('/item/new', VerifyToken, (req, res, next) => {
    let o = new ItemModel(req.body);
    o.save().then(doc => {
        res.status(200).json({ id: doc._id });
    }).catch(er => {
        res.status(400).send(er);
    });
});

// Gets an item ###############################################################
router.get('/item/:id', VerifyToken, (req, res, next) => {
    ItemModel
        .findOne({ _id: req.params.id })
        .then(doc => {
            res.status(200).json(doc);
        })
        .catch(er => {
            res.status(404).json({ 'error': 'Cannot find such order list' });
        });
});

// Updates an item ############################################################
router.put('/item/:id', VerifyToken, (req, res, next) => {
    ItemModel.findOneAndUpdate(
        { _id: req.params.id }, req.body, { new: true }).then(doc => {
            return res.status(200).json(doc);
        }).catch(er => {
            return res.status(404).json({ 'status': 'Order list not found' });
        });
});

// Gets a list of items in the database #######################################
router.get('/items', VerifyToken, (req, res, next) => {
    ItemModel.find({}).then(docs => {
        return res.status(200).json(docs);
    }).catch(err => {
        console.error(err);
        return res.status(404).json({ 'status': 'No items found' });
    });
});

module.exports = router