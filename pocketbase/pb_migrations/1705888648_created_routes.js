/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
	const collection = new Collection({
		"id": "oo0i4aap2sedu4l",
		"created": "2024-01-22 01:57:28.435Z",
		"updated": "2024-01-22 01:57:28.435Z",
		"name": "routes",
		"type": "base",
		"system": false,
		"schema": [
			{
				"system": false,
				"id": "lg8ublbb",
				"name": "category",
				"type": "text",
				"required": true,
				"presentable": false,
				"unique": false,
				"options": {
					"min": null,
					"max": null,
					"pattern": ""
				}
			},
			{
				"system": false,
				"id": "bolwex1w",
				"name": "name",
				"type": "text",
				"required": true,
				"presentable": false,
				"unique": false,
				"options": {
					"min": null,
					"max": null,
					"pattern": ""
				}
			},
			{
				"system": false,
				"id": "y7stfglm",
				"name": "path",
				"type": "json",
				"required": false,
				"presentable": false,
				"unique": false,
				"options": {
					"maxSize": 2000000
				}
			},
			{
				"system": false,
				"id": "s0wiba3j",
				"name": "author",
				"type": "relation",
				"required": false,
				"presentable": false,
				"unique": false,
				"options": {
					"collectionId": "_pb_users_auth_",
					"cascadeDelete": false,
					"minSelect": null,
					"maxSelect": 1,
					"displayFields": null
				}
			},
			{
				"system": false,
				"id": "p8udfmyk",
				"name": "vehicle",
				"type": "text",
				"required": false,
				"presentable": false,
				"unique": false,
				"options": {
					"min": null,
					"max": null,
					"pattern": ""
				}
			},
			{
				"system": false,
				"id": "qejhtlhx",
				"name": "offset",
				"type": "number",
				"required": false,
				"presentable": false,
				"unique": false,
				"options": {
					"min": null,
					"max": null,
					"noDecimal": true
				}
			},
			{
				"system": false,
				"id": "bvoegk1o",
				"name": "status",
				"type": "text",
				"required": false,
				"presentable": false,
				"unique": false,
				"options": {
					"min": null,
					"max": null,
					"pattern": ""
				}
			},
			{
				"system": false,
				"id": "dnz8dixd",
				"name": "progress",
				"type": "number",
				"required": false,
				"presentable": false,
				"unique": false,
				"options": {
					"min": null,
					"max": null,
					"noDecimal": true
				}
			}
		],
		"indexes": [],
		"listRule": null,
		"viewRule": null,
		"createRule": null,
		"updateRule": null,
		"deleteRule": null,
		"options": {}
	});

	return Dao(db).saveCollection(collection);
}, (db) => {
	const dao = new Dao(db);
	const collection = dao.findCollectionByNameOrId("oo0i4aap2sedu4l");

	return dao.deleteCollection(collection);
})
