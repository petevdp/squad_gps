/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
	const dao = new Dao(db)
	const collection = dao.findCollectionByNameOrId("oo0i4aap2sedu4l")

	// add
	collection.schema.addField(new SchemaField({
		"system": false,
		"id": "q3mwu08c",
		"name": "video",
		"type": "file",
		"required": false,
		"presentable": false,
		"unique": false,
		"options": {
			"mimeTypes": [],
			"thumbs": [],
			"maxSelect": 1,
			"maxSize": 5242880,
			"protected": false
		}
	}))

	return dao.saveCollection(collection)
}, (db) => {
	const dao = new Dao(db)
	const collection = dao.findCollectionByNameOrId("oo0i4aap2sedu4l")

	// remove
	collection.schema.removeField("q3mwu08c")

	return dao.saveCollection(collection)
})
