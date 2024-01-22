/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
	const dao = new Dao(db)
	const collection = dao.findCollectionByNameOrId("oo0i4aap2sedu4l")

	// add
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
}, (db) => {
	const dao = new Dao(db)
	const collection = dao.findCollectionByNameOrId("oo0i4aap2sedu4l")

	// remove
	collection.schema.removeField("vwqshbeb")

	return dao.saveCollection(collection)
})
