/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
	const dao = new Dao(db)
	const collection = dao.findCollectionByNameOrId("oo0i4aap2sedu4l")

	// update
	collection.schema.addField(new SchemaField({
		"system": false,
		"id": "vwqshbeb",
		"name": "map_name",
		"type": "text",
		"required": true,
		"presentable": false,
		"unique": false,
		"options": {
			"min": null,
			"max": null,
			"pattern": ""
		}
	}))

	return dao.saveCollection(collection)
}, (db) => {
	const dao = new Dao(db)
	const collection = dao.findCollectionByNameOrId("oo0i4aap2sedu4l")

	// update
	collection.schema.addField(new SchemaField({
		"system": false,
		"id": "vwqshbeb",
		"name": "map_name",
		"type": "text",
		"required": false,
		"presentable": false,
		"unique": false,
		"options": {
			"min": null,
			"max": null,
			"pattern": ""
		}
	}))

	return dao.saveCollection(collection)
})
