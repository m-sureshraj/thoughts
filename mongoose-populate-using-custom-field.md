## Mongoose populate using custom fields (Populate Virtual)

Mongoose [document](https://mongoosejs.com/docs/populate.html) says,
> Population is the process of automatically replacing the specified paths in the document with document(s) from other collection(s).

In Mongoose, we can form relationships between collections 
using the `ref` option. With the `ref` option, we can tell the mongoose to which model it should use during the population.

However, when forming relationships using the `ref` option, 
mongoose uses the `_id` field from the specified `ref` model 
as a **foreign field**, we don't have an option to choose a
 different field as a foreign field.

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

In the above schema, `authorSchema.books` field values must 
be `_ids` of `Book` model's document. Let's assume we have the following data in our database.

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

The `.populate()` method takes a `string` argument and replaces each 
`_ids` value with the matched `Book` document.
In the above query, it's `books` field from the `Author` schema.

When using the `ref` option, the foreign field is always `_id`, 
but sometimes we might have to form a relationship with a different 
field (non `_id` field). Let's take a look at the following schema.

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

If the `ref` option provides a way to choose a foreign field, 
then we could have used the `ref` to form a relationship.
Instead, mongoose provides another feature for this exact use case. 
It's called [Virtuals](https://mongoosejs.com/docs/populate.html#populate-virtuals). 

```javascript
...

bookSchema.virtual('someVirtualName', {
  ref: 'Isbn', // The model to use
  localField: 'isbn', // `bookSchema.isbn`
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

Let's execute the following query.

```javascript
const book = await Book.find({ title: 'Harry Potter' }).populate('someVirtualName').exec();

// console.log(book);

{
  title: 'Harry Potter',
  isbn: '100',
  someVirtualName: [{
    code: '100',
    country: 'USA'
  }]
}
```

The query and the output are pretty self-explanatory. When using virtual, we should pass 
the virtual name as an argument to the `.populate()` method. 
This time the `.populate()` won't touch any existing fields. Instead, it 
creates a new field _(someVirtualName)_ and adds matched documents to it.
When there are no matched documents, it won't create a new field.

By default, the new field's value is an `array`, even if it's matched a single document. 
We can alter this behavior by adding the following property to the `.virtual()` method's options object.

```javascript
bookSchema.virtual('someVirtualName', {
  ...
  justOne: true,
});

// console.log(book);

{
  title: 'Harry Potter',
  isbn: '100',
  someVirtualName: {
    code: '100',
    country: 'USA'
  }
}
```

Note that the options object has a few more useful 
[properties](https://mongoosejs.com/docs/populate.html#populate-virtuals) to control the method behavior.
Also, It's possible to define multiple virtual on the same schema.

```javascript
bookSchema.virtual('virtualOne', {});
bookSchema.virtual('virtualTwo', {});

const book = await Book.find({}).populate('virtualOne virtualTwo').exec();

// or we can chain the `.populate()` method

const book = await Book.find({})
  .populate('virtualOne')
  .populate('virtualTwo')
  .exec();
```

When creating a virtual, we can't use **any** existing local field name as a virtual name. 
If we try, Mongoose will throw an exception.

```javascript
const bookSchema = Schema({
  title: String,
  isbn: String,
});

bookSchema.virtual('isbn', { ... });
```

```
Error: Virtual path "isbn" conflicts with a real path in the schema
  at Schema.virtual (/home/suresh/some-project/node_modules/mongoose/lib/schema.js:1644:11)
  at Schema.virtual (/home/suresh/some-project/node_modules/mongoose/lib/schema.js:1603:26)
```

### Here is the complete code

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
