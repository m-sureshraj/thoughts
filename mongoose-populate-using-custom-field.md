## Mongoose populate using custom fields (Populate Virtual)

Mongoose [document](https://mongoosejs.com/docs/populate.html) says,
> Population is the process of automatically replacing the specified paths in the document with document(s) from other collection(s).

In the mongoose, we can form relationships between collections 
using the `ref` option. With the `ref` option, we can tell the mongoose to which model it should use during the population.

However, when forming relationships using the `ref` option, 
mongoose uses the `_id` field from the specified `ref` model 
as a **foreign field**, we don't have an option to choose a
 different field as a foreign field.

In the following schema, `authorSchema.books` field values must 
be `_ids` of `Book` model's document.

```javascript
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const authorSchema = Schema({
  name: String,
  books: [{ type: Schema.Types.ObjectId, ref: 'Book' }],
});

const bookSchema = Schema({
  title: String,
  isbn: String,
});

const Author = mongoose.model('Author', authorSchema);
const Book = mongoose.model('Book', bookSchema);
```

> The `authorSchema.books` field doesn't have to be an array. It could be just an object if you store only one Book.

Let's assume we have the following data in our database.

```javascript
// `Book` model
const books = [
  { _id: ObjectId('507f1f77bcf86cd799439010'), title: 'Mossad', isbn: '100' },
  { _id: ObjectId('507f1f77bcf86cd799439011'), title: 'The 5am club', isbn: '200' },
];

// `Author` model
const authors = [
  { 
    _id: ObjectId('507f1f77bcf86cd799439013'), 
    name: 'foo', 
    books: [
        ObjectId('507f1f77bcf86cd799439010') // `Mossad' book
    ] 
  }
];
```

Now when querying the `Author` model, we can request mongoose to 
replace the `authorSchema.books` field's `_ids` with the actual `Book` 
documents using the `.populate()` method.

```javascript
const author = await Author.find({ name: 'foo' }).populate('books').exec();

// console.log(author);

{
  _id: ObjectId('507f1f77bcf86cd799439013'),
  name: 'foo',
  books: [
    {
      _id: ObjectId('507f1f77bcf86cd799439010',
      title: 'Mossad',
      isbn: '100'
    }
  ]
}
```

The `.populate()` method takes a `string` argument 
**(the field name to populate. In the above query it was `books` field from `Author` schema)**
and replaces each `_ids` value with the matched `Book` document. 

When using the `ref` option, the foreign field is always `_id`, 
but sometimes we might have to form a relationship with a different 
field (non _id field). Let's take a look at the following schema.

```javascript
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const bookSchema = Schema({
  title: String,
  isbn: String,
});

const isbnSchema = Schema({
  code: String,
  country: String
});

const Book = mongoose.model('Book', bookSchema);
const Isbn = mongoose.model('Isbn', isbnSchema);
```

Let's say we want to form a relationship between the `Book` and `Isbn` collections.
For the above schema we can't use the ref option since the `bookSchema.isbn` 
field stores string value of `isbnSchema.code`, not the `_id` 
value of `Isbn` document.

If the `ref` option provides a way to choose a custom field as a 
foreign field, then we could have used the `ref` to form a relationship.
Instead, mongoose provides another feature for this exact use case. 
It's called [Virtuals](https://mongoosejs.com/docs/populate.html#populate-virtuals). 

```javascript
...

bookSchema.virtual('someVirtualName', {
  ref: 'Isbn', // The model to use
  localField: 'name', // `bookSchema.name`
  foreignField: 'code', // `isbnSchema.code`
});

const Book = mongoose.model('Book', bookSchema);
const Isbn = mongoose.model('Isbn', isbnSchema);
```

Let's assume we have the following data in our database.

```javascript
const books = [
  { title: 'Harry Potter', isbn: '100' },
  { title: 'Lord of the rings', isbn: '200' },
];

const isbns = [
  { code: '100', country: 'USA' },
  { code: '200', country: 'IN' }
];
```

With the following query, we can populate `bookSchema.isbn` field's `string` 
value with the actual `Isbn` 

```javascript
const book = await Book.find({ title: 'Harry Potter' }).populate('someVirtualName').exec();

// console.log(book);

{
  title: 'Harry Potter',
  isbn: {
    code: '100',
    country: 'USA',
  }
}
```

This time we must pass our custom virtual name **(someVirtualName)**
as an argument to the `.populate()` method. Note that the `.virtual()`
method's options object has a few more useful 
[properties](https://mongoosejs.com/docs/populate.html#populate-virtuals) 
to control method behavior.

Here is the complete code.

```javascript
// book.repo.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const bookSchema = Schema({
  title: String,
  isbn: String,
});

const isbnSchema = Schema({
  code: String,
  country: String
});

bookSchema.virtual('someVirtualName', {
  ref: 'Isbn',
  localField: 'name',
  foreignField: 'code',
});

const Book = mongoose.model('Book', bookSchema);
const Isbn = mongoose.model('Isbn', isbnSchema);

async function findBookByTitle(title) {
    return Book.find({ title }).populate('someVirtualName').exec();
}
```

### References
* [Mongoose official documentation](https://mongoosejs.com/docs/populate.html)
* [Populate a mongoose model with a field that isn't an id](https://stackoverflow.com/a/39869551/2967670)
