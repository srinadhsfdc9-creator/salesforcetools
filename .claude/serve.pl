use strict;
use warnings;
use IO::Socket::INET;
use File::Basename;
use Cwd 'abs_path';

my $port = 3000;
my $docroot = dirname(abs_path($0)) . '/..';

my $server = IO::Socket::INET->new(
    LocalAddr => '127.0.0.1',
    LocalPort => $port,
    Proto     => 'tcp',
    Listen    => 5,
    Reuse     => 1,
) or die "Cannot create server: $!\n";

print "Serving on http://localhost:$port\n";

while (my $client = $server->accept()) {
    my $request = <$client>;
    next unless $request;
    # Read headers
    while (my $header = <$client>) {
        last if $header =~ /^\r?\n$/;
    }

    my ($method, $path) = $request =~ /^(\w+)\s+(\S+)/;
    $path =~ s/\?.*//;  # strip query string
    $path = '/package-xml-generator.html' if $path eq '/';

    my $file = "$docroot$path";
    $file =~ s|/+|/|g;

    if (-f $file) {
        open my $fh, '<:raw', $file or next;
        local $/;
        my $content = <$fh>;
        close $fh;

        my $type = 'text/html';
        $type = 'text/css' if $file =~ /\.css$/;
        $type = 'application/javascript' if $file =~ /\.js$/;
        $type = 'image/png' if $file =~ /\.png$/;

        print $client "HTTP/1.0 200 OK\r\n";
        print $client "Content-Type: $type\r\n";
        print $client "Content-Length: " . length($content) . "\r\n";
        print $client "\r\n";
        print $client $content;
    } else {
        print $client "HTTP/1.0 404 Not Found\r\n\r\nNot Found\n";
    }
    close $client;
}
